"""
Бэкенд-функция авторизации для платформы Quest Network.

Поддерживаемые маршруты:
  OPTIONS  /        — обработка CORS preflight
  POST     /login   — вход по номеру телефона и паролю
  POST     /register — регистрация нового пользователя
  GET      /        — получение профиля пользователя по user_id

Переменные окружения:
  DATABASE_URL — строка подключения к PostgreSQL

Схема БД: t_p38581678_quest_network_platfo
Таблицы: users, invitations, settings
"""

import os
import json
import base64
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------

SCHEMA = "t_p38581678_quest_network_platfo"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
}


def get_connection():
    """Возвращает соединение с базой данных PostgreSQL через DATABASE_URL."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Переменная окружения DATABASE_URL не задана")
    return psycopg2.connect(database_url)


def make_response(status_code: int, body: dict) -> dict:
    """Формирует стандартный HTTP-ответ с CORS-заголовками."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }


def build_token(user_id: int, phone: str) -> str:
    """
    Генерирует токен авторизации в формате base64("{user_id}:{phone}").
    Токен не является криптографически защищённым — используется как
    простой идентификатор сессии для разработки.
    """
    raw = f"{user_id}:{phone}"
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def parse_body(event: dict) -> dict:
    """Разбирает тело запроса из события; возвращает пустой словарь при ошибке."""
    body = event.get("body", "") or ""
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except (json.JSONDecodeError, TypeError):
        return {}


# ---------------------------------------------------------------------------
# Обработчики маршрутов
# ---------------------------------------------------------------------------


def handle_login(event: dict) -> dict:
    """
    POST /login — аутентификация пользователя.

    Принимает JSON: {phone, password}
    Возвращает:    {user_id, name, role, token}

    Поиск выполняется по полю phone. Пароль сравнивается напрямую
    с полем password_hash (без хеширования — временная реализация).
    """
    data = parse_body(event)
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not phone or not password:
        return make_response(400, {"error": "Поля phone и password обязательны"})

    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id, phone, password_hash, name, role, status
                FROM {SCHEMA}.users
                WHERE phone = %s
                LIMIT 1
                """,
                (phone,),
            )
            user = cur.fetchone()

        if user is None:
            return make_response(401, {"error": "Пользователь не найден"})

        # Простое сравнение пароля (без хеширования)
        if password != user["password_hash"]:
            return make_response(401, {"error": "Неверный пароль"})

        if user["status"] == "pending":
            return make_response(403, {"error": "Аккаунт ожидает подтверждения администратора"})

        token = build_token(user["id"], user["phone"])
        return make_response(200, {
            "user_id": user["id"],
            "name": user["name"],
            "role": user["role"],
            "token": token,
        })

    except RuntimeError as exc:
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


def handle_register(event: dict) -> dict:
    """
    POST /register — регистрация нового пользователя.

    Принимает JSON: {phone, password, name, invite_code?}
    Возвращает:    {user_id, name, role, status}

    Логика:
      1. Проверяет уникальность номера телефона.
      2. Создаёт пользователя с role='participant', status='pending'.
      3. Если передан invite_code — ищет его в таблице invitations
         (поле code, is_used = false) и помечает использованным
         (used_by = user_id, used_at = now).
      4. Читает настройку auto_approve_participants из таблицы settings
         (первая запись с role owner). Если true — устанавливает status='active'.
    """
    data = parse_body(event)
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    invite_code = (data.get("invite_code") or "").strip() or None

    if not phone or not password or not name:
        return make_response(400, {"error": "Поля phone, password и name обязательны"})

    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # Проверка дубликата телефона
            cur.execute(
                f"SELECT id FROM {SCHEMA}.users WHERE phone = %s LIMIT 1",
                (phone,),
            )
            if cur.fetchone():
                conn.rollback()
                return make_response(409, {"error": "Пользователь с таким телефоном уже существует"})

            # Определяем начальный статус
            status = "pending"

            # Читаем настройку auto_approve_participants
            cur.execute(
                f"""
                SELECT settings
                FROM {SCHEMA}.settings
                WHERE role = 'owner'
                LIMIT 1
                """
            )
            settings_row = cur.fetchone()
            if settings_row and settings_row.get("settings"):
                raw_settings = settings_row["settings"]
                # settings может быть dict (jsonb) или строкой
                if isinstance(raw_settings, str):
                    try:
                        raw_settings = json.loads(raw_settings)
                    except Exception:
                        raw_settings = {}
                auto_approve = raw_settings.get("auto_approve_participants", False)
                if auto_approve:
                    status = "active"

            # Создаём пользователя
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.users
                    (phone, password_hash, name, role, status, created_at)
                VALUES
                    (%s, %s, %s, 'participant', %s, %s)
                RETURNING id
                """,
                (phone, password, name, status, datetime.now(timezone.utc)),
            )
            new_user = cur.fetchone()
            user_id = new_user["id"]

            # Обрабатываем инвайт-код
            if invite_code:
                cur.execute(
                    f"""
                    SELECT id FROM {SCHEMA}.invitations
                    WHERE code = %s AND (is_used = false OR is_used IS NULL)
                    LIMIT 1
                    """,
                    (invite_code,),
                )
                invitation = cur.fetchone()
                if invitation:
                    cur.execute(
                        f"""
                        UPDATE {SCHEMA}.invitations
                        SET is_used = true,
                            used_by = %s,
                            used_at = %s
                        WHERE id = %s
                        """,
                        (user_id, datetime.now(timezone.utc), invitation["id"]),
                    )

            conn.commit()

        return make_response(201, {
            "user_id": user_id,
            "name": name,
            "role": "participant",
            "status": status,
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


def handle_get_profile(event: dict) -> dict:
    """
    GET /?user_id=X — получение профиля пользователя.

    Параметры запроса: user_id (обязательный)
    Возвращает поля: id, phone, name, role, email, vk, max_messenger,
                     avatar_url, status, created_at
    """
    query_params = event.get("queryStringParameters") or {}
    user_id = query_params.get("user_id")

    if not user_id:
        return make_response(400, {"error": "Параметр user_id обязателен"})

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        return make_response(400, {"error": "Параметр user_id должен быть целым числом"})

    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id, phone, name, role, email, vk, max_messenger,
                       avatar_url, status, created_at
                FROM {SCHEMA}.users
                WHERE id = %s
                LIMIT 1
                """,
                (user_id_int,),
            )
            user = cur.fetchone()

        if user is None:
            return make_response(404, {"error": "Пользователь не найден"})

        return make_response(200, dict(user))

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
    Точка входа функции авторизации.

    Маршрутизирует входящие запросы по методу и пути:
      OPTIONS  *         -> CORS preflight
      GET      /         -> профиль пользователя
      POST     /login    -> вход
      POST     /register -> регистрация
    """
    method = (event.get("httpMethod") or event.get("method") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"

    # CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": CORS_HEADERS,
            "body": "",
        }

    if method == "GET" and path == "/":
        return handle_get_profile(event)

    if method == "POST" and path in ("/login", "/auth/login"):
        return handle_login(event)

    if method == "POST" and path in ("/register", "/auth/register"):
        return handle_register(event)

    return make_response(404, {"error": f"Маршрут {method} {path} не найден"})
