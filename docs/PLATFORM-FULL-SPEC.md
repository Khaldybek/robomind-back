# Полный функционал платформы — спецификация

Документ связывает продуктовые требования с **бэкендом (Nest)**, **фронтом (Next / React-админка)**, **воркерами**, **БД** и **инфраструктурой**.

---

## 1. Регистрация и онбординг

### Продукт

| Требование | Реализация |
|------------|------------|
| Форма: ИИН, ФИО, email, пароль | `POST /auth/register` + валидация ИИН (12 цифр), пароль (политика) |
| Каскад город → район → школа | Уже: `GET /app/cities`, `.../districts`, `.../schools`; сохранить `schoolId` |
| Верификация email | После регистрации: статус `pending_email` → письмо со ссылкой `GET /auth/verify-email?token=` → `email_verified_at` |
| Активация админом школы | Статус `pending_activation` после верификации; `PATCH /admin/users/:id/activate` → `active`; до активации вход запрещён или только «ожидание» |
| Push/email при активации | Очередь (BullMQ): задача `notify-user-activated` → email + Web Push |

### БД (дополнения)

- `users`: `status` ENUM (`pending_email`, `pending_activation`, `active`, `suspended`), `email_verified_at`, `email_verification_token` + `expires_at` (хеш токена в БД).
- Опционально: `user_push_subscriptions` (endpoint, keys, user_id) для PWA.

### API (дополнения)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/auth/verify-email` | Подтверждение email (query `token`) |
| POST | `/auth/resend-verification` | Повторное письмо (rate limit) |

### Инфра

- SMTP / SendGrid / Mailgun; шаблоны писем.
- Redis + BullMQ для отложенных писем и пушей.

---

## 2. Управление доступами (админ)

### Продукт

| Требование | Реализация |
|------------|------------|
| Постоянный / временный + дата | Уже: `course_accesses.access_type`, `expires_at`; крон отзыв |
| Массовая выдача по школе | `POST /admin/courses/:courseId/access/bulk` body: `{ schoolId, userIds? }` или «все ученики школы» с фильтрами |
| Массовая выдача по классу | Сущность **`classes`** (школа, название/год, опционально) + **`user_classes`** (user_id, class_id); bulk по `classId` |
| Автоотзыв по сроку | Cron (ежечасно): `UPDATE course_accesses SET revoked_at = now() WHERE access_type = temporary AND expires_at < now() AND revoked_at IS NULL` |
| История выдачи/отзыва | Таблица **`course_access_history`** (user_id, course_id, action grant/revoke, granted_by, at, meta JSON) или единый **`audit_logs`** с типом сущности |
| CSV импорт учеников | `POST /admin/users/import` (multipart CSV) → парсинг → создание пользователей `pending_activation`, дубликаты по ИИН/email |

### API

| Метод | Путь |
|-------|------|
| POST | `/admin/courses/:courseId/access/bulk` |
| GET | `/admin/courses/:courseId/access/history` |
| POST | `/admin/users/import` |
| CRUD | `/admin/classes` (если вводите классы) |

---

## 3. Плеер модуля

### Продукт

| Требование | Где |
|------------|-----|
| HLS адаптив | Фронт: hls.js / Video.js; в контенте `file_url` или `hls_manifest_url` (плейлист .m3u8 в MinIO после транскодинга) |
| Позиция просмотра | `PATCH /app/modules/:moduleId/progress` body: `{ watchedSeconds, lastPositionSec }` → `user_progress` + опционально отдельная таблица **`module_watch_position`** по (user, content_item) |
| Скачивание PDF/архивов | `GET` presigned URL из `POST /admin/upload/file` → ключ в MinIO; фронт открывает ссылку |
| Rich-text с картинками | `module_contents.type = text`, HTML; бэк: санитизация (DOMPurify на фронте + серверная проверка); картинки в том же бакете |
| Прямой эфир + таймер | Поля `livestream_url`, `livestream_starts_at`; фронт считает обратный отсчёт |
| Внешние ссылки | `type = link`, `content` = URL; открытие в новой вкладке |

### Бэкенд

- Воркер транскодинга (FFmpeg) upload MP4 → HLS в MinIO (опционально этап 2).
- Presigned PUT для загрузки, presigned GET для выдачи (срок 15–60 мин).

---

## 4. Система тестирования

| Требование | Реализация |
|------------|------------|
| Типы вопросов | Уже в БД: single / multiple / text |
| Картинки | `questions.image_url` |
| Таймер, попытки, проходной % | `quizzes`: time_limit_minutes, max_attempts, passing_score |
| Перемешивание | При `GET /app/modules/:id/quiz` если `shuffle_questions` / флаг shuffle answers — отдавать порядок случайный, хранить mapping attempt_id → order |
| Разбор ошибок | В ответе `POST .../submit` при завершении попытки: для каждого вопроса `correct`, `userAnswer`, `explanation` (новое поле `questions.explanation` TEXT) |
| Следующий модуль | Транзакция: при `is_passed` обновить прогресс модуля, выставить следующий модуль `available` в `user_progress` или логикой порядка |

### API

| Метод | Путь |
|-------|------|
| GET | `/app/quizzes/:id/attempt/:attemptId/review` | после сдачи — разбор (или в теле submit) |

---

## 5. Прогресс и сертификаты

| Требование | Реализация |
|------------|------------|
| Дашборд ученика | `GET /app/users/me/dashboard` — курсы, % по каждому, ближайшие дедлайны |
| Прогресс-бар | Агрегат: завершённые модули / всего модулей в курсе |
| PDF сертификат | Воркер: по событию «курс завершён» → PDF (pdfkit/puppeteer), загрузка в MinIO, запись `certificates.pdf_url` |
| QR проверки | В PDF и публично: URL `https://site/verify/:uniqueCode` |
| Публичная верификация | **Без авторизации** `GET /api/v1/public/certificates/:code` → { valid, courseName, issuedAt, studentName? частично маскирован } |

---

## 6. Аналитика (админ)

| Метод | Описание |
|-------|----------|
| Агрегаты по курсу | DAU/MAU по `user_progress` / логам, % завершивших курс |
| Рейтинг по школам | GROUP BY school_id, ORDER BY avg(progress) или баллы тестов |
| Статистика тестов | Средний балл, % сдавших с первого раза — по `quiz_attempts` |
| Экспорт | `GET /admin/analytics/courses/:id/export?format=xlsx|csv` |
| График активности | Таблица **`user_activity_daily`** (user_id, date, minutes) или ночной job агрегации из событий |

### API (пример)

- `GET /admin/analytics/overview`
- `GET /admin/analytics/courses/:courseId`
- `GET /admin/analytics/schools/ranking`
- `GET /admin/analytics/quizzes/:quizId`

---

## 7. Уведомления

| Канал | События |
|-------|---------|
| Email | Регистрация, верификация, активация, выдача доступа к курсу, напоминание об эфире |
| In-app | Таблица `notifications` (user_id, type, payload, read_at); `GET /app/notifications`, `PATCH .../read` |
| PWA Push | Подписка `POST /app/push/subscribe`; триггеры: новый модуль, эфир через 15 мин |
| Крон эфира | За 15 мин до `livestream_starts_at` по модулям — нотификации подписанным пользователям курса |
| Telegram (опционально) | Отдельный сервис/bot, webhook `POST /integrations/telegram`, связка `users.telegram_chat_id` |

---

## 8. Безопасность

| Мера | Реализация (Nest) |
|------|-------------------|
| Rate limiting | `@nestjs/throttler` глобально + ужесточение на `/auth/*`, `/auth/register` |
| Helmet | `helmet()` в `main.ts` |
| CORS | `app.enableCors({ origin: [фронт, админка], credentials: true })` |
| CSRF | Если refresh в httpOnly cookie — CSRF token для админки; при чистом JWT в Authorization — основной риск XSS, не CSRF |
| Presigned URL | MinIO SDK, короткий TTL, не проксировать файлы через Node для больших объёмов |
| Аудит админов | Таблица **`admin_audit_logs`** (admin_id, action, resource, old/new JSON, ip, user_agent) |
| ИИН | Хранение: **AES-256-GCM** (ключ в KMS/Secret Manager); для поиска — необязательный HMAC-индекс или хранить только хеш для дедупа + зашифрованное поле (уточнить юридически) |

---

## 9. Фазы внедрения (бэкенд)

1. **Статусы пользователя + email verification + активация**  
2. **Доступы: крон истечения, history, bulk, классы + CSV import**  
3. **Квиз: shuffle, review, открытие следующего модуля**  
4. **Прогресс видео API + presigned MinIO**  
5. **Сертификаты PDF + QR + public verify**  
6. **Очереди писем/push, in-app notifications, крон эфира**  
7. **Аналитика + экспорт**  
8. **Аудит, шифрование ИИН, hardening (throttle, helmet)**

---

## 10. Зависимости (Docker / сервисы)

- PostgreSQL, Redis, MinIO, (опционально) Mailhog → прод: SMTP.  
- Воркеры: отдельный процесс `nest build` + worker entry или отдельный контейнер BullMQ consumers.

Этот документ можно использовать как единый бэклог; детализацию API при необходимости переносите в `docs/REST-API.md`.
