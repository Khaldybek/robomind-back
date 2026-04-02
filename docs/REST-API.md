# REST API

Базовый префикс: **`/api/v1`**

| Зона | Префикс | Назначение |
|------|---------|------------|
| **Auth** | `/auth` | Регистрация/вход (ученик + админы), токены |
| **App** | `/app` | Публичный фронт (Next.js): гео для регистрации, курсы ученика, тесты |
| **Admin** | `/admin` | React-админка: пользователи, гео CRUD, курсы, доступы, загрузки |

Авторизация: `Authorization: Bearer <access_token>`. Роли: `student`, `school_admin`, `super_admin` — guards на уровне маршрутов.

**Документы по фронтам (запросы/ответы):**

- Студент: [API-STUDENT-PANEL.md](./API-STUDENT-PANEL.md)
- Админ школы: [API-SCHOOL-ADMIN-PANEL.md](./API-SCHOOL-ADMIN-PANEL.md)
- Супер-админ: [API-SUPER-ADMIN-PANEL.md](./API-SUPER-ADMIN-PANEL.md)

---

## Auth (общий)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация ученика |
| POST | `/auth/login` | Вход |
| POST | `/auth/refresh` | Тело `{ refreshToken }` → новая пара access+refresh |
| POST | `/auth/logout` | Тело `{ refreshToken? }` — отозвать сессию |
| POST | `/auth/logout-all` | `Authorization: Bearer` — отозвать все refresh |
| POST | `/auth/forgot-password` | Запрос сброса пароля |

---

## App — фронт (ученик / гость где разрешено)

### Гео (для формы регистрации)

| Метод | Путь |
|-------|------|
| GET | `/app/cities` |
| GET | `/app/cities/:cityId/districts` |
| GET | `/app/districts/:districtId/schools` |

### Профиль ученика

| Метод | Путь |
|-------|------|
| GET | `/app/users/me` |
| PATCH | `/app/users/me` | *(опционально: правка своего профиля)* |

### Курсы и модули

| Метод | Путь |
|-------|------|
| GET | `/app/courses` | Курсы с активным доступом |
| GET | `/app/courses/:courseId/modules` | Курс + модули (`course`, `modules`) |
| GET | `/app/modules/:moduleId/content` | Контент модуля |
| GET | `/app/modules/:moduleId/quiz` | Данные теста (без ключей ответов в проде) |

### Тесты

| Метод | Путь |
|-------|------|
| POST | `/app/quizzes/:quizId/attempt` | Начать попытку |
| POST | `/app/attempts/:attemptId/submit` | Сдать тест |

### Прогресс и сертификаты (свои)

| Метод | Путь |
|-------|------|
| GET | `/app/users/me/progress` |
| GET | `/app/users/me/certificates` |

---

## Admin — админка

### Пользователи

| Метод | Путь | Роль |
|-------|------|------|
| GET | `/admin/users` | SA / SchoolAdmin (своя школа) |
| GET | `/admin/users/:userId` | SA / SchoolAdmin |
| PUT | `/admin/users/:userId` | SA / SchoolAdmin |
| PATCH | `/admin/users/:userId/activate` | SA / SchoolAdmin |
| GET | `/admin/users/:userId/progress` | SA / SchoolAdmin |
| GET | `/admin/users/:userId/certificates` | SA / SchoolAdmin |

### Гео (создание — в основном SA; школы может делегировать позже)

| Метод | Путь |
|-------|------|
| POST | `/admin/cities` |
| POST | `/admin/districts` |
| POST | `/admin/schools` |

### Курсы и доступы

| Метод | Путь |
|-------|------|
| GET | `/admin/courses` | Список всех (фильтры, пагинация) |
| POST | `/admin/courses` | Создать курс |
| POST | `/admin/courses/:courseId/access` | Выдать доступ ученику |
| DELETE | `/admin/courses/:courseId/access/:userId` | Отозвать доступ |
| GET | `/admin/courses/:courseId/students` | Студенты курса |

### Модули и контент

| Метод | Путь |
|-------|------|
| GET | `/admin/courses/:courseId/modules` | Модули (редактор) |
| POST | `/admin/modules` | Создать модуль |
| POST | `/admin/modules/:moduleId/content` | Добавить блок контента |

### Загрузки

| Метод | Путь |
|-------|------|
| POST | `/admin/upload/video` |
| POST | `/admin/upload/file` |

---

## Расширения (полный функционал платформы)

См. **`docs/PLATFORM-FULL-SPEC.md`**. Кратко по маршрутам:

### Auth

| Метод | Путь |
|-------|------|
| GET | `/auth/verify-email?token=` |
| POST | `/auth/resend-verification` |

### App

| Метод | Путь |
|-------|------|
| PATCH | `/app/modules/:moduleId/progress` | Позиция просмотра видео |
| GET | `/app/users/me/dashboard` | Дашборд + прогресс-бары |
| GET | `/app/notifications` |
| PATCH | `/app/notifications/:id/read` |
| POST | `/app/push/subscribe` | PWA Web Push |

### Public (без JWT)

| Метод | Путь |
|-------|------|
| GET | `/public/certificates/:uniqueCode` | Верификация сертификата |

### Admin

| Метод | Путь |
|-------|------|
| POST | `/admin/courses/:courseId/access/bulk` | Массовая выдача (школа / класс) |
| GET | `/admin/courses/:courseId/access/history` | История доступов |
| POST | `/admin/users/import` | CSV импорт учеников |
| CRUD | `/admin/classes` | Классы (при массовой выдаче по классу) |
| GET | `/admin/analytics/overview` |
| GET | `/admin/analytics/courses/:courseId` |
| GET | `/admin/analytics/schools/ranking` |
| GET | `/admin/analytics/quizzes/:quizId` |
| GET | `/admin/analytics/.../export` | Excel/CSV |

### ИИ (OpenAI)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/app/ai/chat` | Чат по модулю (Bearer JWT, роль student) |
| GET | `/app/ai/recommendations?courseId=` | Рекомендации для дашборда |
| POST | `/app/ai/grade-text` | Оценка текстового ответа |
| POST | `/admin/ai/quiz/generate` | Генерация вопросов по тексту / `moduleId` |
| POST | `/admin/ai/summarize` | Краткое содержание модуля |
| POST | `/admin/ai/transcribe` | Whisper → текст + VTT (`multipart file`) |

Подробнее: **`docs/AI-SERVICES.md`**.

---

## Соответствие вашему исходному списку

Исходные пути перенесены так:

- Списки/действия ученика → префикс **`/app/...`**
- Управление и просмотр чужих пользователей → **`/admin/...`**
- Auth без префикса app/admin — один вход для фронта и админки (роль в JWT).
