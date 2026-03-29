"""
Бэкенд-функция внутренних сообщений для платформы Quest Network.

Поддерживаемые маршруты:
  OPTIONS  /                          — обработка CORS preflight
  GET      /?user_id=X&with=Y         — история переписки между X и Y
                                        (также помечает входящие сообщения прочитанными)
  GET      /?user_id=X&inbox=1        — список диалогов с последним сообщением
                                        и числом непрочитанных
  POST     /                          — отправить сообщение {from_user_id, to_user_id, body}

Переменные окружения:
  DATABASE_URL — строка подключения к PostgreSQL

Схема БД: t_p38581678_quest_network_platfo
Таблицы: messages, users
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
    # Если сам event — строка JSON
    if isinstance(event, str):
        try:
            parsed = json.loads(event)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    body = event.get("body", "") or ""

    # Уже десериализованный словарь
    if isinstance(body, dict):
        return body

    # Строка — пробуем распарсить
    try:
        result = json.loads(body)
        return result if isinstance(result, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def to_int(value, param_name: str):
    """
    Преобразует значение к int. При неудаче возвращает кортеж (None, response_dict)
    с готовым ответом об ошибке, иначе возвращает (int_value, None).
    """
    try:
        return int(value), None
    except (ValueError, TypeError):
        return None, make_response(400, {"error": f"Параметр {param_name} должен быть целым числом"})


# ---------------------------------------------------------------------------
# Обработчики маршрутов
# ---------------------------------------------------------------------------


def handle_history(user_id: int, with_user_id: int) -> dict:
    """
    GET /?user_id=X&with=Y — история переписки между двумя пользователями.

    Возвращает список сообщений вида:
      [{id, from_user_id, to_user_id, body, is_read, created_at, from_name}]
    Сортировка: created_at ASC.

    Побочный эффект: все сообщения, адресованные user_id (to_user_id=X)
    от собеседника Y, помечаются is_read=true.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # Помечаем входящие сообщения прочитанными
            cur.execute(
                f"""
                UPDATE {SCHEMA}.messages
                SET is_read = true
                WHERE to_user_id = %s
                  AND from_user_id = %s
                  AND is_read = false
                """,
                (user_id, with_user_id),
            )

            # Получаем историю переписки с именем отправителя
            cur.execute(
                f"""
                SELECT
                    m.id,
                    m.from_user_id,
                    m.to_user_id,
                    m.body,
                    m.is_read,
                    m.created_at,
                    u.name AS from_name
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON u.id = m.from_user_id
                WHERE
                    (m.from_user_id = %s AND m.to_user_id = %s)
                    OR
                    (m.from_user_id = %s AND m.to_user_id = %s)
                ORDER BY m.created_at ASC
                """,
                (user_id, with_user_id, with_user_id, user_id),
            )
            messages = [dict(row) for row in cur.fetchall()]

        conn.commit()
        return make_response(200, messages)

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


def handle_inbox(user_id: int) -> dict:
    """
    GET /?user_id=X&inbox=1 — список диалогов пользователя.

    Для каждого уникального собеседника возвращает:
      [{other_user_id, other_name, last_message, last_time, unread_count}]

    Диалоги отсортированы по времени последнего сообщения (DESC),
    то есть самые свежие переписки идут первыми.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                WITH conversations AS (
                    -- Все собеседники: те, кому писал X, и те, кто писал X
                    SELECT
                        CASE
                            WHEN from_user_id = %(uid)s THEN to_user_id
                            ELSE from_user_id
                        END AS other_user_id,
                        body,
                        created_at,
                        CASE
                            WHEN to_user_id = %(uid)s AND is_read = false THEN 1
                            ELSE 0
                        END AS is_unread
                    FROM {SCHEMA}.messages
                    WHERE from_user_id = %(uid)s OR to_user_id = %(uid)s
                ),
                ranked AS (
                    SELECT
                        other_user_id,
                        body,
                        created_at,
                        is_unread,
                        ROW_NUMBER() OVER (
                            PARTITION BY other_user_id
                            ORDER BY created_at DESC
                        ) AS rn
                    FROM conversations
                ),
                last_msgs AS (
                    SELECT
                        other_user_id,
                        body  AS last_message,
                        created_at AS last_time
                    FROM ranked
                    WHERE rn = 1
                ),
                unread_counts AS (
                    SELECT
                        other_user_id,
                        SUM(is_unread) AS unread_count
                    FROM conversations
                    GROUP BY other_user_id
                )
                SELECT
                    lm.other_user_id,
                    u.name  AS other_name,
                    lm.last_message,
                    lm.last_time,
                    uc.unread_count
                FROM last_msgs lm
                JOIN unread_counts uc USING (other_user_id)
                JOIN {SCHEMA}.users u ON u.id = lm.other_user_id
                ORDER BY lm.last_time DESC
                """,
                {"uid": user_id},
            )
            dialogs = [dict(row) for row in cur.fetchall()]

        return make_response(200, dialogs)

    except RuntimeError as exc:
        return make_response(500, {"error": str(exc)})
    except Exception as exc:
        return make_response(500, {"error": f"Внутренняя ошибка сервера: {exc}"})
    finally:
        if conn:
            conn.close()


def handle_send(event: dict) -> dict:
    """
    POST / — отправка нового сообщения.

    Принимает JSON: {from_user_id, to_user_id, body}
    Возвращает:    {id, created_at}

    Все три поля обязательны. Поле body не может быть пустой строкой.
    """
    data = parse_body(event)

    from_user_id = data.get("from_user_id")
    to_user_id = data.get("to_user_id")
    body = (data.get("body") or "").strip()

    if from_user_id is None or to_user_id is None:
        return make_response(400, {"error": "Поля from_user_id и to_user_id обязательны"})
    if not body:
        return make_response(400, {"error": "Поле body не может быть пустым"})

    from_user_id_int, err = to_int(from_user_id, "from_user_id")
    if err:
        return err
    to_user_id_int, err = to_int(to_user_id, "to_user_id")
    if err:
        return err

    conn = None
    try:
        conn = get_connection()
        now = datetime.now(timezone.utc)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.messages
                    (from_user_id, to_user_id, body, is_read, created_at)
                VALUES
                    (%s, %s, %s, false, %s)
                RETURNING id, created_at
                """,
                (from_user_id_int, to_user_id_int, body, now),
            )
            row = cur.fetchone()

        conn.commit()
        return make_response(201, {"id": row["id"], "created_at": row["created_at"]})

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


def handle_health() -> dict:
    """
    GET / без параметров — проверка работоспособности функции (health check).

    Возвращает статус сервиса без обращения к базе данных.
    """
    return make_response(200, {"status": "ok", "service": "messages"})


# ---------------------------------------------------------------------------
# Главный обработчик
# ---------------------------------------------------------------------------


def handler(event: dict, context) -> dict:
    """
    Точка входа функции внутренних сообщений.

    Маршрутизирует входящие запросы по HTTP-методу и query-параметрам:
      OPTIONS  /                   -> CORS preflight (200)
      GET      / (нет параметров)  -> health check
      GET      /?user_id=X&with=Y  -> история переписки
      GET      /?user_id=X&inbox=1 -> список диалогов
      POST     /                   -> отправить сообщение
    """
    method = (event.get("httpMethod") or event.get("method") or "GET").upper()

    # CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    query_params = event.get("queryStringParameters") or {}

    # --- GET ---
    if method == "GET":
        user_id_raw = query_params.get("user_id")

        # Health check — нет обязательных параметров
        if not user_id_raw:
            return handle_health()

        user_id, err = to_int(user_id_raw, "user_id")
        if err:
            return err

        # История переписки: ?user_id=X&with=Y
        with_raw = query_params.get("with")
        if with_raw is not None:
            with_user_id, err = to_int(with_raw, "with")
            if err:
                return err
            return handle_history(user_id, with_user_id)

        # Список диалогов: ?user_id=X&inbox=1
        inbox = query_params.get("inbox")
        if inbox:
            return handle_inbox(user_id)

        # user_id есть, но нет with или inbox
        return make_response(400, {
            "error": "Укажите параметр 'with' для истории переписки или 'inbox=1' для списка диалогов"
        })

    # --- POST ---
    if method == "POST":
        return handle_send(event)

    return make_response(404, {"error": f"Маршрут {method} не поддерживается"})