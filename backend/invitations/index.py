"""
Бэкенд-функция управления приглашениями для платформы Quest Network.

Поддерживаемые маршруты:
  OPTIONS  /            — обработка CORS preflight
  POST     /create      — создать новое приглашение
  GET      /?code=XXX   — проверить валидность кода приглашения
  GET      /?owner_id=X — список приглашений, созданных пользователем X

Переменные окружения:
  DATABASE_URL — строка подключения к PostgreSQL

Схема БД: t_p38581678_quest_network_platfo
Таблицы: invitations, users
"""

import os
import json
import secrets
import string
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Константы
# ---------------------------------------------------------------------------

SCHEMA = "t_p38581678_quest_network_platfo"

INVITE_URL_BASE = "https://masterputhey.ru/join"

# Алфавит для генерации invite_code: заглавные буквы + цифры
CODE_ALPHABET = string.ascii_uppercase + string.digits
CODE_LENGTH = 8

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
}

# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------


def get_connection():
    """Возвращает соединение с базой данных PostgreSQL через DATABASE_URL."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Переменная окружения DATABASE_URL не задана")
    return psycopg2.connect(database_url)


def make_response(status_code: int, body) -> dict:
    """Формирует стандартный HTTP-ответ с CORS-заголовками."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def parse_body(event) -> dict:
    """
    Разбирает тело запроса из события.

    Обрабатывает следующие случаи:
      - event — dict с ключом 'body' (строка или dict)
      - event — сама строка JSON (нестандартный вызов runtime)
    Возвращает пустой словарь при любой ошибке разбора.
    """
    if isinstance(event, str):
        try:
            parsed = json.loads(event)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    body = event.get("body", "") or ""

    if isinstance(body, dict):
        return body

    try:
        result = json.loads(body)
        return result if isinstance(result, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def generate_invite_code() -> str:
    """
    Генерирует криптографически случайный код приглашения длиной 8 символов.
    Используется алфавит из заглавных латинских букв и цифр (A-Z, 0-9).
    Пример: 'A3KX9WBT'
    """
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def build_invite_url(code: str) -> str:
    """Возвращает полную ссылку для перехода по коду приглашения."""
    return f"{INVITE_URL_BASE}?code={code}"


def to_int(value, param_name: str):
    """
    Пробует привести value к int.
    Возвращает (int_value, None) при успехе или (None, error_response) при ошибке.
    """
    try:
        return int(value), None
    except (ValueError, TypeError):
        return None, make_response(
            400, {"error": f"Параметр {param_name} должен быть целым числом"}
        )


# ---------------------------------------------------------------------------
# Обработчики маршрутов
# ---------------------------------------------------------------------------


def handle_create(event: dict) -> dict:
    """
    POST /create — создание нового приглашения.

    Принимает JSON: {created_by, phone?, name?, channel}
      - created_by (int, обязательный) — id пользователя, создающего приглашение
      - channel    (str, обязательный) — канал распространения (например: 'vk', 'telegram')
      - phone      (str, опциональный) — телефон приглашаемого
      - name       (str, опциональный) — имя приглашаемого

    Возвращает: {invite_code, invite_url}

    Генерирует уникальный invite_code; при коллизии делает до 5 повторных попыток.
    """
    data = parse_body(event)

    created_by = data.get("created_by")
    channel = (data.get("channel") or "").strip()
    phone = (data.get("phone") or "").strip() or None
    name = (data.get("name") or "").strip() or None

    if created_by is None:
        return make_response(400, {"error": "Поле created_by обязательно"})
    if not channel:
        return make_response(400, {"error": "Поле channel обязательно"})

    created_by_int, err = to_int(created_by, "created_by")
    if err:
        return err

    conn = None
    try:
        conn = get_connection()
        now = datetime.now(timezone.utc)

        # Попытки вставки с разными кодами на случай коллизии
        for attempt in range(5):
            code = generate_invite_code()
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        INSERT INTO {SCHEMA}.invitations
                            (created_by, invite_code, phone, channel, created_at)
                        VALUES
                            (%s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (created_by_int, code, phone, channel, now),
                    )
                    cur.fetchone()
                conn.commit()
                break
            except psycopg2.errors.UniqueViolation:
                # Коллизия кода — пробуем снова
                conn.rollback()
                if attempt == 4:
                    return make_response(
                        500, {"error": "Не удалось сгенерировать уникальный код. Попробуйте позже."}
                    )
                continue

        return make_response(201, {
            "invite_code": code,
            "invite_url": build_invite_url(code),
        })

    except RuntimeError as exc:
        if conn:
            conn.rollback()
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        if conn:
            conn.rollback()
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


def handle_check_code(code: str) -> dict:
    """
    GET /?code=XXX — проверка кода приглашения.

    Возвращает JSON:
      {
        valid:   bool  — код существует и не просрочен и не использован,
        expired: bool  — срок действия истёк (expires_at < now),
        used:    bool  — уже был использован (used_by IS NOT NULL)
      }

    Если код не найден в базе — valid=false, expired=false, used=false.
    """
    conn = None
    try:
        conn = get_connection()
        now = datetime.now(timezone.utc)

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT expires_at, used_by
                FROM {SCHEMA}.invitations
                WHERE invite_code = %s
                LIMIT 1
                """,
                (code,),
            )
            row = cur.fetchone()

        if row is None:
            return make_response(200, {"valid": False, "expired": False, "used": False})

        used = row["used_by"] is not None
        expired = (
            row["expires_at"] is not None
            and row["expires_at"] < now.replace(tzinfo=None)
        ) if row["expires_at"] else False

        # Пробуем сравнить с учётом tzinfo
        if row["expires_at"] is not None:
            exp = row["expires_at"]
            # Нормализуем: если expires_at aware — сравниваем с aware now
            if hasattr(exp, "tzinfo") and exp.tzinfo is not None:
                expired = exp < now
            else:
                expired = exp < now.replace(tzinfo=None)

        valid = not used and not expired

        return make_response(200, {"valid": valid, "expired": expired, "used": used})

    except RuntimeError as exc:
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


def handle_list_by_owner(owner_id: int) -> dict:
    """
    GET /?owner_id=X — список приглашений, созданных пользователем X.

    Возвращает массив объектов:
      [{id, invite_code, phone, channel, used_by, used_at, expires_at, created_at, invite_url}]

    Список отсортирован по created_at DESC (новые сначала).
    """
    conn = None
    try:
        conn = get_connection()

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    id,
                    invite_code,
                    phone,
                    channel,
                    used_by,
                    used_at,
                    expires_at,
                    created_at
                FROM {SCHEMA}.invitations
                WHERE created_by = %s
                ORDER BY created_at DESC
                """,
                (owner_id,),
            )
            rows = cur.fetchall()

        result = []
        for row in rows:
            item = dict(row)
            item["invite_url"] = build_invite_url(item["invite_code"])
            result.append(item)

        return make_response(200, result)

    except RuntimeError as exc:
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


# ---------------------------------------------------------------------------
# Главный обработчик
# ---------------------------------------------------------------------------


def handler(event: dict, context) -> dict:
    """
    Точка входа функции управления приглашениями.

    Маршрутизирует входящие запросы по HTTP-методу и пути/параметрам:
      OPTIONS  *               -> CORS preflight (200)
      POST     /create         -> создать приглашение
      GET      /?code=XXX      -> проверить код
      GET      /?owner_id=X    -> список приглашений владельца
    """
    method = (event.get("httpMethod") or event.get("method") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"

    # CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    # POST /create
    if method == "POST" and path in ("/create", "/invitations/create"):
        return handle_create(event)

    # GET — разбираем query-параметры
    if method == "GET":
        query_params = event.get("queryStringParameters") or {}

        code = query_params.get("code")
        if code:
            return handle_check_code(code.strip())

        owner_id_raw = query_params.get("owner_id")
        if owner_id_raw is not None:
            owner_id, err = to_int(owner_id_raw, "owner_id")
            if err:
                return err
            return handle_list_by_owner(owner_id)

        return make_response(400, {
            "error": "Укажите параметр 'code' для проверки кода или 'owner_id' для списка приглашений"
        })

    return make_response(404, {"error": f"Маршрут {method} {path} не найден"})
