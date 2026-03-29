"""
Бэкенд-функция управления пользователями для платформы Quest Network.

Поддерживаемые маршруты:
  OPTIONS  /          — обработка CORS preflight
  GET      /?owner_id=X — все участники (role=participant) для владельца
  GET      /?id=X     — профиль одного пользователя
  PUT      /?id=X     — обновить профиль пользователя
  GET      /pending   — участники со статусом 'pending'

Переменные окружения:
  DATABASE_URL — строка подключения к PostgreSQL

Схема БД: t_p38581678_quest_network_platfo
Таблица: users
"""

import os
import json
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Константы
# ---------------------------------------------------------------------------

SCHEMA = "t_p38581678_quest_network_platfo"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
}

# Поля профиля, разрешённые для обновления через PUT
UPDATABLE_FIELDS = {"name", "email", "vk", "max_messenger", "status"}

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


def handle_health() -> dict:
    """GET / без параметров — health check, не обращается к БД."""
    return make_response(200, {"status": "ok", "service": "users"})


def handle_list_participants(owner_id: int) -> dict:
    """
    GET /?owner_id=X — список всех участников платформы.

    Параметр owner_id зарезервирован для будущей мультиарендности;
    в текущей реализации возвращает всех пользователей с role='participant'.
    Поля: id, name, phone, role, status, email, vk, created_at.
    Список отсортирован по created_at DESC.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id, name, phone, role, status, email, vk, created_at
                FROM {SCHEMA}.users
                WHERE role = 'participant'
                ORDER BY created_at DESC
                """
            )
            rows = [dict(r) for r in cur.fetchall()]

        return make_response(200, rows)

    except RuntimeError as exc:
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


def handle_get_one(user_id: int) -> dict:
    """
    GET /?id=X — профиль одного пользователя.

    Возвращает все публичные поля:
      id, phone, name, role, email, vk, max_messenger,
      avatar_url, status, approved_at, approved_by, created_at
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id, phone, name, role, email, vk, max_messenger,
                       avatar_url, status, approved_at, approved_by, created_at
                FROM {SCHEMA}.users
                WHERE id = %s
                LIMIT 1
                """,
                (user_id,),
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


def handle_update(user_id: int, event: dict) -> dict:
    """
    PUT /?id=X — частичное обновление профиля пользователя.

    Принимает JSON с любым подмножеством полей:
      {name?, email?, vk?, max_messenger?, status?}

    Особая логика: если поле status меняется на 'active',
    автоматически проставляется approved_at = NOW().

    Обновляются только переданные поля. Если ни одного допустимого поля
    не передано — возвращает 400.
    Возвращает: {updated: true}
    """
    data = parse_body(event)

    updates = {k: v for k, v in data.items() if k in UPDATABLE_FIELDS}

    if not updates:
        return make_response(400, {
            "error": f"Передайте хотя бы одно из полей: {', '.join(sorted(UPDATABLE_FIELDS))}"
        })

    # Если статус меняется на active — добавляем approved_at
    if updates.get("status") == "active":
        updates["approved_at"] = datetime.now(timezone.utc)

    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            set_clauses = ", ".join(f"{col} = %s" for col in updates)
            values = list(updates.values()) + [user_id]
            cur.execute(
                f"""
                UPDATE {SCHEMA}.users
                SET {set_clauses}
                WHERE id = %s
                """,
                values,
            )
            if cur.rowcount == 0:
                conn.rollback()
                return make_response(404, {"error": "Пользователь не найден"})

        conn.commit()
        return make_response(200, {"updated": True})

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


def handle_pending() -> dict:
    """
    GET /pending — список участников, ожидающих одобрения.

    Возвращает всех пользователей с role='participant' и status='pending',
    отсортированных по created_at ASC (самые старые заявки — первыми).
    Поля: id, name, phone, role, status, email, vk, created_at.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id, name, phone, role, status, email, vk, created_at
                FROM {SCHEMA}.users
                WHERE role = 'participant'
                  AND status = 'pending'
                ORDER BY created_at ASC
                """
            )
            rows = [dict(r) for r in cur.fetchall()]

        return make_response(200, rows)

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
    Точка входа функции управления пользователями.

    Маршрутизация:
      OPTIONS  *              -> CORS preflight (200)
      GET      /pending       -> список участников на модерации
      GET      / (нет params) -> health check
      GET      /?owner_id=X  -> список всех участников
      GET      /?id=X        -> профиль одного пользователя
      PUT      /?id=X        -> обновить профиль
    """
    method = (event.get("httpMethod") or event.get("method") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"

    # CORS preflight
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    query_params = event.get("queryStringParameters") or {}

    # GET /pending — проверяем путь до разбора query-параметров
    if method == "GET" and path in ("/pending", "/users/pending"):
        return handle_pending()

    # GET /
    if method == "GET":
        id_raw = query_params.get("id")
        owner_id_raw = query_params.get("owner_id")

        # health check — нет параметров
        if not id_raw and not owner_id_raw:
            return handle_health()

        # Один пользователь по id
        if id_raw:
            user_id, err = to_int(id_raw, "id")
            if err:
                return err
            return handle_get_one(user_id)

        # Список участников
        owner_id, err = to_int(owner_id_raw, "owner_id")
        if err:
            return err
        return handle_list_participants(owner_id)

    # PUT /?id=X
    if method == "PUT":
        id_raw = query_params.get("id")
        if not id_raw:
            return make_response(400, {"error": "Параметр id обязателен"})
        user_id, err = to_int(id_raw, "id")
        if err:
            return err
        return handle_update(user_id, event)

    return make_response(404, {"error": f"Маршрут {method} {path} не найден"})
