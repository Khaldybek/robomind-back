# Супер-админ: логин и пароль

**Готовых учётных данных в репозитории нет** — это небезопасно.

## Как получить доступ

1. В **`.env`** (локально, не в git):

```env
SUPER_ADMIN_EMAIL=ваш@email.com
SUPER_ADMIN_PASSWORD=минимум_8_символов
```

2. **Обязательно** поднять PostgreSQL и применить миграции (без этого будет ошибка `relation "users" does not exist`):

```bash
npm run docker:up
# подождать ~5 сек, пока Postgres поднимется
npm run migration:run
```

Проверка: в логе миграций должны пройти `InitialSchema`, `AiDailyUsage…`, `DeviceLimit…` и т.д.

**zsh:** не вставляйте блок с строками `# комментарий` целиком — для zsh это ошибки. Выполняйте по одной команде: `npm run docker:up`, затем `npm run migration:run`, затем `npm run seed:super-admin`.

3. Создать пользователя:

```bash
npm run seed:super-admin
```

4. В `.env` задать **`JWT_ACCESS_SECRET`** (длинная случайная строка), иначе приложение не запустится.

5. Миграция refresh-токенов (один раз после обновления кода):

```bash
npm run migration:run
```

6. Войти:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "ваш@email.com",
  "password": "тот_же_пароль_что_в_SUPER_ADMIN_PASSWORD"
}
```

**Ответ:** `accessToken`, `refreshToken`, `expiresIn` (сек), `tokenType: "Bearer"`, `user`.

Обновление access: `POST /api/v1/auth/refresh` с телом `{ "refreshToken": "…" }`.

Выход со всех устройств: `POST /api/v1/auth/logout-all` с заголовком `Authorization: Bearer <accessToken>`.

Поле **`deviceId` для супер-админа не обязательно**.

Если пользователь с таким email уже был — скрипт выставит ему роль `super_admin` и новый пароль из `.env`.
