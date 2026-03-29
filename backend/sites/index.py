"""
Бэкенд-функция управления сайтами для платформы Quest Network.

Поддерживаемые маршруты:
  OPTIONS  /                        — обработка CORS preflight
  GET      /?owner_id=X             — список сайтов владельца
  POST     /                        — создать новый сайт
  PUT      /?id=X                   — обновить данные сайта
  GET      /integration-data?owner_id=X — данные интеграции и промпт для ИИ

Переменные окружения:
  DATABASE_URL — строка подключения к PostgreSQL

Схема БД: t_p38581678_quest_network_platfo
Таблицы: sites
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

# Алфавит для генерации network_key: заглавные буквы + цифры
KEY_ALPHABET = string.ascii_uppercase + string.digits
KEY_SUFFIX_LENGTH = 8

API_BASE = "https://api.masterputhey.ru"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Network-Key",
    "Content-Type": "application/json",
}

# Поля сайта, разрешённые для обновления через PUT
UPDATABLE_FIELDS = {"name", "domain", "style_preset", "status", "auto_approve"}

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


def generate_network_key() -> str:
    """
    Генерирует уникальный ключ сети в формате 'MP-XXXXXXXX'.
    Суффикс — 8 криптографически случайных символов из A-Z и 0-9.
    Пример: 'MP-A3KX9WBT'
    """
    suffix = "".join(secrets.choice(KEY_ALPHABET) for _ in range(KEY_SUFFIX_LENGTH))
    return f"MP-{suffix}"


def build_api_endpoint(network_key: str) -> str:
    """Формирует URL API-эндпоинта сайта по его network_key."""
    return f"{API_BASE}/{network_key}"


def build_ai_prompt(api_endpoint: str, network_key: str) -> str:
    """
    Возвращает готовый промпт для генерации сайта-квеста с помощью ИИ.
    Подставляет конкретные значения api_endpoint и network_key.
    """
    return (
        f"Создай сайт-квест совместимый с платформой Мастер Путей. "
        f"Требования: "
        f"1) На главной странице должна быть форма входа/регистрации с полями телефон и пароль. "
        f"2) При регистрации отправляй POST запрос на {api_endpoint}/auth с телефоном, паролем, "
        f"именем и invite_code (если есть). "
        f"3) Используй network_key: {network_key} в заголовке X-Network-Key всех запросов к API. "
        f"4) Стиль оформления: тёмная тема, цвета синий/фиолетовый/золотой, "
        f"шрифты Cormorant + Montserrat, мистическая атмосфера. "
        f"5) На странице квеста: форма ввода ответа, отображение подсказок, "
        f"визуальная обратная связь 'Проход открыт' при верном ответе. "
        f"6) Личный кабинет участника с кнопкой перехода к путям и формой обратной связи. "
        f"7) Все страницы адаптивны для мобильных."
    )


# ---------------------------------------------------------------------------
# Обработчики маршрутов
# ---------------------------------------------------------------------------


def handle_health() -> dict:
    """GET / без параметров — health check, не обращается к БД."""
    return make_response(200, {"status": "ok", "service": "sites"})


def handle_list_by_owner(owner_id: int) -> dict:
    """
    GET /?owner_id=X — список сайтов, принадлежащих пользователю X.

    Для каждого сайта возвращает:
      [{id, name, domain, network_key, status, style_preset, auto_approve, paths_count}]

    paths_count — количество путей (paths), связанных с сайтом.
    Список отсортирован по created_at DESC.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    s.id,
                    s.name,
                    s.domain,
                    s.network_key,
                    s.status,
                    s.style_preset,
                    s.auto_approve,
                    COUNT(p.id) AS paths_count
                FROM {SCHEMA}.sites s
                LEFT JOIN {SCHEMA}.paths p ON p.site_id = s.id
                WHERE s.owner_id = %s
                GROUP BY s.id
                ORDER BY s.created_at DESC
                """,
                (owner_id,),
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


def handle_create(event: dict) -> dict:
    """
    POST / — создание нового сайта.

    Принимает JSON: {owner_id, name, domain?, style_preset?}
      - owner_id     (int, обязательный) — id владельца сайта
      - name         (str, обязательный) — название сайта
      - domain       (str, опциональный) — домен сайта
      - style_preset (str, опциональный) — пресет оформления, по умолчанию 'dark_mystic'

    Автоматически генерирует network_key и api_endpoint.
    Возвращает: {id, network_key, api_endpoint}
    """
    data = parse_body(event)

    owner_id = data.get("owner_id")
    name = (data.get("name") or "").strip()
    domain = (data.get("domain") or "").strip() or None
    style_preset = (data.get("style_preset") or "dark_mystic").strip()

    if owner_id is None:
        return make_response(400, {"error": "Поле owner_id обязательно"})
    if not name:
        return make_response(400, {"error": "Поле name обязательно"})

    owner_id_int, err = to_int(owner_id, "owner_id")
    if err:
        return err

    conn = None
    try:
        conn = get_connection()
        now = datetime.now(timezone.utc)

        # Генерируем network_key с защитой от коллизий
        for attempt in range(5):
            network_key = generate_network_key()
            api_endpoint = build_api_endpoint(network_key)
            try:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        INSERT INTO {SCHEMA}.sites
                            (owner_id, name, domain, network_key, api_endpoint,
                             style_preset, status, auto_approve, created_at)
                        VALUES
                            (%s, %s, %s, %s, %s, %s, 'active', false, %s)
                        RETURNING id
                        """,
                        (owner_id_int, name, domain, network_key,
                         api_endpoint, style_preset, now),
                    )
                    row = cur.fetchone()
                conn.commit()
                return make_response(201, {
                    "id": row["id"],
                    "network_key": network_key,
                    "api_endpoint": api_endpoint,
                })
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                if attempt == 4:
                    return make_response(
                        500,
                        {"error": "Не удалось сгенерировать уникальный network_key. Попробуйте позже."},
                    )
                continue

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


def handle_update(site_id: int, event: dict) -> dict:
    """
    PUT /?id=X — частичное обновление сайта.

    Принимает JSON с любым подмножеством полей:
      {name?, domain?, style_preset?, status?, auto_approve?}

    Обновляются только переданные поля. Если ни одного допустимого поля
    не передано — возвращает 400.
    Возвращает: {updated: true}
    """
    data = parse_body(event)

    # Собираем только разрешённые поля, которые реально переданы
    updates = {k: v for k, v in data.items() if k in UPDATABLE_FIELDS}

    if not updates:
        return make_response(400, {
            "error": f"Передайте хотя бы одно из полей: {', '.join(sorted(UPDATABLE_FIELDS))}"
        })

    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            set_clauses = ", ".join(f"{col} = %s" for col in updates)
            values = list(updates.values()) + [site_id]
            cur.execute(
                f"""
                UPDATE {SCHEMA}.sites
                SET {set_clauses}
                WHERE id = %s
                """,
                values,
            )
            if cur.rowcount == 0:
                conn.rollback()
                return make_response(404, {"error": "Сайт не найден"})

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


def handle_integration_data(owner_id: int) -> dict:
    """
    GET /integration-data?owner_id=X — данные интеграции для первого активного сайта владельца.

    Возвращает:
      {
        integration: {network_key, api_endpoint, style_preset},
        ai_prompt:   "готовый промпт для генерации сайта-квеста с помощью ИИ"
      }

    Если у владельца нет сайтов — возвращает 404.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT network_key, api_endpoint, style_preset
                FROM {SCHEMA}.sites
                WHERE owner_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (owner_id,),
            )
            site = cur.fetchone()

        if site is None:
            return make_response(404, {"error": "У владельца нет сайтов"})

        network_key = site["network_key"]
        api_endpoint = site["api_endpoint"] or build_api_endpoint(network_key)

        return make_response(200, {
            "integration": {
                "network_key": network_key,
                "api_endpoint": api_endpoint,
                "style_preset": site["style_preset"],
            },
            "ai_prompt": build_ai_prompt(api_endpoint, network_key),
        })

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
    Точка входа функции управления сайтами.

    Маршрутизация:
      OPTIONS  *                          -> CORS preflight (200)
      GET      / (нет параметров)         -> health check
      GET      /?owner_id=X              -> список сайтов владельца
      POST     /                          -> создать сайт
      PUT      /?id=X                    -> обновить сайт
      GET      /integration-data?...     -> данные интеграции + промпт ИИ
    """
    method = (event.get("httpMethod") or event.get("method") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"

    # CORS preflight
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    query_params = event.get("queryStringParameters") or {}

    # GET /integration-data
    if method == "GET" and path in ("/integration-data", "/sites/integration-data"):
        owner_id_raw = query_params.get("owner_id")
        if not owner_id_raw:
            return make_response(400, {"error": "Параметр owner_id обязателен"})
        owner_id, err = to_int(owner_id_raw, "owner_id")
        if err:
            return err
        return handle_integration_data(owner_id)

    # GET /
    if method == "GET":
        owner_id_raw = query_params.get("owner_id")
        if not owner_id_raw:
            return handle_health()
        owner_id, err = to_int(owner_id_raw, "owner_id")
        if err:
            return err
        return handle_list_by_owner(owner_id)

    # POST /
    if method == "POST":
        return handle_create(event)

    # PUT /?id=X
    if method == "PUT":
        site_id_raw = query_params.get("id")
        if not site_id_raw:
            return make_response(400, {"error": "Параметр id обязателен"})
        site_id, err = to_int(site_id_raw, "id")
        if err:
            return err
        return handle_update(site_id, event)

    return make_response(404, {"error": f"Маршрут {method} {path} не найден"})
