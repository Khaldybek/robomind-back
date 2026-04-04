# Деплой на Vercel

## Переменные окружения

Обязательно задайте в проекте Vercel (**Settings → Environment Variables**):

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` или `DB_URL` | Строка подключения PostgreSQL, например из Neon / Supabase / Vercel Postgres |
| `JWT_ACCESS_SECRET` | Секрет для JWT |
| `OPENAI_API_KEY` | Если используете ИИ-модули |
| Остальное | По необходимости см. `.env.example` |

Для облачной БД с обязательным SSL, если строка не содержит `sslmode=require`, добавьте **`DB_SSL=true`**.

Локально и на сервере без «одной строки» по-прежнему можно использовать `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`.

## Сборка и маршруты

- **`vercel.json`** — `version: 2`, **`outputDirectory": "public"`** — Vercel требует, чтобы этот каталог **появился после сборки**. Nest пишет только в **`dist/`**, поэтому в **`npm run build`** добавлен шаг **`scripts/ensure-public-output.cjs`** (создаёт `public/` и маркер-файл).
- **`rewrites`** — всё на **`/api`** (serverless).
- **`api/index.ts`** — handler: Nest из `dist/bootstrap-app.js`.

### Настройки проекта на vercel.com

- **Framework Preset:** Other (или пусто). В `vercel.json` задано **`"framework": null`**, чтобы не включался авто-пресет Nest без нужных признаков.
- **Output Directory:** должен совпадать с **`vercel.json`** (`public`). Если в UI задано иное — выровняйте или оставьте пустым, чтобы читался только `vercel.json`.

В **`src/main.ts`** оставлен прямой импорт **`@nestjs/core`** (и `void NestFactory`) — иначе сборка Vercel может выдать *«No entrypoint found which imports nestjs»*.

Корень API: **`/api/v1`** (как локально). На проде URL будет вида `https://<project>.vercel.app/api/v1/...`.

## Миграции и сиды

Выполняйте **с машины с доступом к БД** (или CI), с тем же `DATABASE_URL`:

```bash
npm run migration:run
npm run seed:super-admin
```

## Ограничения serverless

- **Файловая система** не постоянная: каталог `uploads/` на Vercel не подходит для долгого хранения загрузок. Для продакшена используйте объектное хранилище (S3, R2 и т.д.).
- **Таймаут** функции увеличен до **60 с** в `vercel.json`; при необходимости поднимите лимит в настройках проекта на Vercel.
- **Холодный старт**: первый запрос после простоя может быть медленнее.

## Альтернатива

Тот же код можно деплоить на **Railway**, **Fly.io**, **Render**, **Docker** — там обычно проще полноценный Node-процесс с `node dist/main` и постоянным диском для `uploads/`.
