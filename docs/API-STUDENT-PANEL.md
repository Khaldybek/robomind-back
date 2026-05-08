# API панели студента — запросы и ответы

Базовый URL: **`{ORIGIN}/api/v1`**

## Зачем всё в одном файле

| Зачем | Пояснение |
|--------|-----------|
| **Один источник для фронта** | Разработчики панели студента смотрят один документ: не нужно собирать контракт из разных модулей кода (`app-api`, `auth`, `ai`). |
| **Сквозной сценарий** | Регистрация → гео → логин → курсы → секция курса → урок → тест → прогресс → ИИ — идут по порядку в одном месте. |
| **Короткая навигация** | `API-STRUCTURE.md` — только **список путей**; этот файл — **тела запросов и формы ответов** для UI. |
| **Версионирование** | Проще отслеживать изменения контракта студента в одном diff, чем по многим README. |

Общие заголовки:

- `Authorization: Bearer <access_token>` — для маршрутов `/app/*` (кроме гео), `/app/ai/*`, `logout-all`
- `Content-Type: application/json` — для POST/PATCH с телом

Для защищённых маршрутов приложения: **`Authorization: Bearer <accessToken>`**, роль **`student`**.

### Сводка маршрутов (панель студента)

| Метод | Путь | Тело | Кратко ответ |
|--------|------|------|----------------|
| POST | `/auth/register` | регистрация, опц. `deviceId` | профиль или токены + user |
| POST | `/auth/login` | `email`, `password`, `deviceId` (для student) | токены + user |
| POST | `/auth/refresh` | `refreshToken` | новая пара токенов |
| POST | `/auth/logout` | опц. `refreshToken` | `204` |
| POST | `/auth/logout-all` | — (Bearer) | `204` |
| POST | `/auth/forgot-password` | `email` | `{ ok: true }` |
| POST | `/auth/reset-password` | `token`, `password` | `{ ok: true }` |
| GET | `/app/cities` | — | список городов |
| GET | `/app/cities/:cityId/districts` | — | районы |
| GET | `/app/districts/:districtId/schools` | — | школы |
| GET | `/app/users/me` | — (Bearer) | профиль + школа |
| GET | `/app/users/me/profile` | — (Bearer) | расширенный профиль: фото, курсы, сертификаты, успеваемость |
| PATCH | `/app/users/me` | опц. имя, отчество, `avatarUrl` | обновлённый профиль |
| POST | `/app/users/me/avatar` | `multipart/form-data`: `file` | загрузка фото профиля (автоматически ставит `avatarUrl`) |
| GET | `/app/users/me/dashboard` | — | сводка + курсы |
| GET | `/app/users/me/progress` | — | массив прогресса по урокам |
| GET | `/app/users/me/certificates` | — | сертификаты |
| GET | `/app/courses` | — | курсы с доступом |
| GET | `/app/courses/:courseId/modules` | — | `course` (id, title, thumbnailUrl) + **`modules[]`** — **секции курса** (модули курса), не уроки |
| GET | `/app/course-modules/:courseModuleId/lessons` | — | список **уроков** в секции (`lessons[]`, порядок, `unlockAfterLessonId`) |
| GET | `/app/lessons/:lessonId/content` | — | блоки контента урока |
| GET | `/app/lessons/:lessonId/quiz` | — | тест (вопросы с `answers`, без правильных) |
| PATCH | `/app/lessons/:lessonId/progress` | опц. `watchedSeconds`, `status`, `completed` | запись прогресса по уроку |
| POST | `/app/lessons/:lessonId/homework` | `multipart/form-data`: `file`, опц. `comment` | сдача ДЗ (повтор — замена файла, сброс оценки) |
| GET | `/app/lessons/:lessonId/homework` | — | текущая сдача и оценка или `{ submission: null }` |
| POST | `/app/quizzes/:quizId/attempt` | — | `attemptId`, `startedAt`, `maxScore`, `resumed` |
| POST | `/app/attempts/:attemptId/submit` | `answers`: объект `questionId` → ответ | баллы, `isPassed`, при успехе прогресс урока |
| POST | `/app/ai/chat` | `lessonId`, `messages[]`, опц. `language` `ru`\|`kk` | ответ ассистента (контекст — материал урока) |
| POST | `/app/ai/chat-profile` | `messages[]`, опц. `language` `ru`\|`kk` | прямой чат ИИ в профиле (без lessonId) |
| POST | `/app/ai/chat-course` | `courseId`, `messages[]`, опц. `language` `ru`\|`kk` | чат ИИ по всему курсу |
| GET | `/app/ai/recommendations` | query `courseId?`, опц. `language` `ru`\|`kk` | рекомендации |
| POST | `/app/ai/grade-text` | вопрос, ответы, эталон, опц. `language` | оценка + фидбек |
| GET | `/app/gamification/me` | — | XP, уровень, стрик, бейджи, прогресс уровня, подсказки по бейджам |
| GET | `/app/gamification/leaderboard` | query `schoolId?`, `limit?` | топ учеников |
| GET | `/app/gamification/my-rank` | query `schoolId?` | место в рейтинге + всего участников |

Ниже — те же эндпоинты с полями и примерами JSON.

---

## 1. Auth

### `POST /auth/login`

| | |
|--|--|
| **Назначение** | Вход **student | school_admin | super_admin** |

**Тело (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `email` | string | да | Email |
| `password` | string | да | Пароль |
| `deviceId` | string (UUID) | **да для student** | Стабильный ID устройства |

**Ответ `200`:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs…",
  "refreshToken": "base64url_одноразовый_секрет",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "role": "student",
    "email": "…",
    "firstName": "…",
    "lastName": "…",
    "schoolId": "uuid | null"
  }
}
```

- **`expiresIn`** — через сколько секунд протухнет access (см. `JWT_ACCESS_EXPIRES`).
- **`refreshToken`** — хранить безопасно; по нему выдаётся новая пара токенов.

**Ошибки:** `401`, `400` (нет deviceId у ученика), `403` (лимит устройств).

---

### `POST /auth/refresh`

**Тело:** `{ "refreshToken": "<тот же, что при login>" }`

**Ответ `200`:** такая же структура, как у login (новые `accessToken`, **новый** `refreshToken`, старый refresh инвалидируется — ротация).

**Ошибка `401`:** неверный или истёкший refresh.

---

### `POST /auth/logout`

**Тело (опционально):** `{ "refreshToken": "…" }` — отозвать эту сессию.

**Ответ:** `204` без тела.

---

### `POST /auth/logout-all`

**Заголовок:** `Authorization: Bearer <accessToken>`

Отзывает **все** refresh-сессии пользователя.

**Ответ:** `204`

---

### `POST /auth/register`

Регистрация ученика.

**Тело (JSON):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `email` | string | да | Email |
| `password` | string | да | Пароль (мин. 8 символов) |
| `firstName`, `lastName` | string | да | Имя, фамилия |
| `patronymic` | string? | нет | Отчество |
| `iin` | string (12 цифр) | да | ИИН |
| `schoolId` | uuid | да | Активная школа |
| `deviceId` | uuid | нет | Если указан — ответ как у **login** (токены + `user`) |

**Ответ `201` без `deviceId`:** профиль `{ id, email, role, firstName, lastName, schoolId }`.

**Ответ `201` с `deviceId`:** как у `POST /auth/login` (`accessToken`, `refreshToken`, `expiresIn`, `tokenType`, `user`). Ошибка `403` — лимит устройств.

---

### `POST /auth/forgot-password`

**Тело:** `{ "email": "…" }`

**Ответ `202`:** `{ "ok": true }` (в dev токен сброса может печататься в лог сервера).

---

### `POST /auth/reset-password`

**Тело:** `{ "token": "…", "password": "…" }` (новый пароль)

**Ответ `200`:** `{ "ok": true }`

---

## 2. Гео (регистрация)

### `GET /app/cities`

| Вход | Нет тела. Query нет. |
|------|----------------------|

**Ответ `200`:** массив активных городов — поля вроде `id`, `name`, `nameKz`, `isActive`, `createdAt`, `updatedAt`.

---

### `GET /app/cities/:cityId/districts`

| Вход | Параметр пути: `cityId` (UUID) |

**Целевой ответ `200`:**

```json
[
  { "id": "uuid", "name": "…", "nameKz": "…", "cityId": "uuid" }
]
```

---

### `GET /app/districts/:districtId/schools`

| Вход | Параметр пути: `districtId` (UUID) |

**Целевой ответ `200`:**

```json
[
  {
    "id": "uuid",
    "name": "Школа …",
    "number": 12,
    "districtId": "uuid",
    "address": "…",
    "isActive": true
  }
]
```

---

**Футер панели ученика** не отдаётся с бэка: лого, ссылки и текст задаются **во фронтенд-приложении** (как на лендинге — общий компонент или `public/`).

---

## 3. Профиль

### `GET /app/users/me`

**Заголовок:** `Authorization: Bearer <accessToken>`

Пользователь определяется из JWT (`sub`).

**Ответ `200`:** объект с полями `id`, `email`, `firstName`, `lastName`, `patronymic`, `iin`, `role`, `schoolId`, `school` (`id`, `name`, `districtId` или `null`), `avatarUrl`, `isActive`, `createdAt`, `updatedAt`.

*(пароль не отдаётся)*

---

### `GET /app/users/me/profile`

**Заголовок:** `Authorization: Bearer <accessToken>`

Расширенный профиль в одном запросе:

- базовые поля пользователя (как в `GET /app/users/me`, включая `avatarUrl`);
- `certificates`: массив сертификатов (как `GET /app/users/me/certificates`);
- `courses`: доступные курсы + прогресс по каждому (`totalLessons`, `completedLessons`, `lessonsInProgress`, `progressPercent`);
- `performance`: агрегированная успеваемость (`overallProgressPercent`, `averageQuizPercent`, и др.).

**Ответ `200` (сокращённо):**

```json
{
  "id": "uuid",
  "avatarUrl": "https://...",
  "certificates": [],
  "courses": [
    {
      "id": "uuid",
      "title": "Робототехника",
      "thumbnailUrl": "/api/v1/files/images/...",
      "totalLessons": 10,
      "completedLessons": 4,
      "lessonsInProgress": 2,
      "progressPercent": 40
    }
  ],
  "performance": {
    "coursesCount": 2,
    "certificatesCount": 1,
    "totalLessons": 10,
    "lessonsCompleted": 4,
    "lessonsInProgress": 2,
    "overallProgressPercent": 40,
    "totalQuizAttempts": 7,
    "averageQuizPercent": 78.6
  }
}
```

---

### `PATCH /app/users/me`

**Тело:** только изменяемые поля (все опционально): `firstName`, `lastName`, `patronymic`, `avatarUrl` (строка URL или пустая строка для сброса).

**Ответ `200`:** тот же формат, что у `GET /app/users/me`.

---

### `POST /app/users/me/avatar`

**Заголовок:** `Authorization: Bearer <accessToken>`  
**Тело:** `multipart/form-data`, поле **`file`** (изображение).

Сервер сам сохраняет файл и обновляет `avatarUrl` у текущего ученика.

**Ответ `200`:** тот же формат, что у `GET /app/users/me` (с новым `avatarUrl`).

---

## 4. Курсы

### `GET /app/courses`

**Целевой ответ `200`:** список курсов с доступом у ученика:

```json
[
  {
    "id": "uuid",
    "title": "…",
    "description": "…",
    "thumbnailUrl": "…",
    "level": "beginner",
    "ageGroup": "…",
    "order": 0
  }
]
```

---

### `GET /app/courses/:courseId/modules`

| Вход | `courseId` — UUID в пути |

**Ответ `200`:** объект с полями **`course`** и **`modules`**:

- **`course`:** `id`, `title`, **`thumbnailUrl`** (обложка, может быть `null`; часто путь вида `/api/v1/files/images/...`).
- **`modules`:** массив **опубликованных секций курса** (модулей курса) — для каждой: `id`, `title`, `description`, `order`, **`unlockAfterCourseModuleId`**, `createdAt`, `updatedAt`.

Список уроков внутри секции — отдельный запрос **`GET /app/course-modules/:courseModuleId/lessons`**. Разблокировка между секциями учитывает завершение всех уроков предыдущей секции; между уроками — поле **`unlockAfterLessonId`** в ответе списка уроков и прогресс в **`GET /app/users/me/progress`**.

Пример:

```json
{
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Робототехника для начинающих",
    "thumbnailUrl": "/api/v1/files/images/abc123.webp"
  },
  "modules": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "Введение",
      "description": null,
      "order": 0,
      "unlockAfterCourseModuleId": null,
      "createdAt": "2025-03-01T10:00:00.000Z",
      "updatedAt": "2025-03-15T14:30:00.000Z"
    }
  ]
}
```

---

### `GET /app/course-modules/:courseModuleId/lessons`

| Вход | `courseModuleId` — UUID секции из `GET .../courses/:courseId/modules` |

**Ответ `200`:** объект с **`courseModuleId`** и **`lessons`**: для каждого урока — `id`, `title`, `description`, `order`, **`unlockAfterLessonId`**, `createdAt`, `updatedAt` (только опубликованные уроки).

---

## 5. Контент урока и тест

### `GET /app/lessons/:lessonId/content`

**Целевой ответ `200`:**

```json
[
  {
    "id": "uuid",
    "lessonId": "uuid",
    "type": "video | file | text | livestream | link",
    "title": "…",
    "content": "HTML или URL",
    "fileUrl": "ключ MinIO / URL",
    "duration": 120,
    "order": 0,
    "livestreamUrl": "…",
    "livestreamStartsAt": "2025-01-01T12:00:00.000Z"
  }
]
```

---

### `GET /app/lessons/:lessonId/quiz`

**Ответ `200`:** объект квиза: `id`, **`lessonId`**, `title`, `passingScore`, `maxAttempts`, `timeLimitMinutes`, `shuffleQuestions`, `createdAt`, `updatedAt`, `questions[]`.  
У каждого вопроса: `id`, `text`, `type` (`single` \| `multiple` \| `text`), `order`, `imageUrl`, **`answers`**: `[{ "id", "text", "createdAt", "updatedAt" }]` — **без** признака правильности.

*(у `text` вопросов список `answers` может быть пустым)*

---

## 6. Попытка и сдача теста

### `POST /app/quizzes/:quizId/attempt`

| Вход | Путь: `quizId` (UUID). Тело не требуется. |

**Ответ `201`:**

```json
{
  "attemptId": "uuid",
  "quizId": "uuid",
  "startedAt": "2025-01-01T12:00:00.000Z",
  "maxScore": 10,
  "resumed": false
}
```

Если незавершённая попытка уже есть — та же структура с `"resumed": true` (новая не создаётся).

**Ошибки:** `400` (лимит попыток, нет вопросов), `403/404` (нет доступа к уроку).

---

### `POST /app/attempts/:attemptId/submit`

**Тело:** объект **`answers`** — словарь **`questionId` (строка-UUID) → ответ**:

| Тип вопроса | Значение в `answers[questionId]` |
|-------------|----------------------------------|
| `single` | строка — UUID выбранного `answer.id` |
| `multiple` | массив строк — UUID выбранных ответов |
| `text` | строка — текст ответа |

Пример:

```json
{
  "answers": {
    "uuid-вопроса-1": "uuid-варианта",
    "uuid-вопроса-2": ["uuid-a", "uuid-b"],
    "uuid-вопроса-3": "текст ответа"
  }
}
```

**Ответ `200`:**

```json
{
  "attemptId": "uuid",
  "quizId": "uuid",
  "score": 8,
  "maxScore": 10,
  "percent": 80,
  "isPassed": true,
  "passingScore": 70,
  "completedAt": "2025-01-01T12:30:00.000Z"
}
```

При **`isPassed: true`** бэкенд дополнительно помечает прогресс урока как завершённый.

**Ошибки:** `400` (уже сдана, истекло время), `404` (нет попытки).

---

## 7. Прогресс и сертификаты

### `GET /app/users/me/dashboard`

**Заголовок:** `Authorization: Bearer <accessToken>`

**Ответ `200`:** сводка для главной.

```json
{
  "coursesCount": 2,
  "lessonsCompleted": 5,
  "lessonsInProgress": 1,
  "certificatesCount": 0,
  "courses": [
    {
      "id": "uuid",
      "title": "…",
      "thumbnailUrl": "…",
      "level": "…",
      "order": 1
    }
  ]
}
```

---

### `GET /app/users/me/progress`

**Заголовок:** `Authorization: Bearer <accessToken>`

**Ответ `200`:** массив, для каждой записи: `id`, `courseId`, `courseTitle`, **`lessonId`**, **`lessonTitle`**, `status` (`not_started` \| `in_progress` \| `completed`), `completedAt`, `watchedSeconds`, `updatedAt`.

---

### `PATCH /app/lessons/:lessonId/progress`

**Заголовок:** `Authorization: Bearer <accessToken>`

Обновление прогресса по уроку (доступ проверяется как у контента урока).

**Тело (все поля опционально):**

| Поле | Тип | Описание |
|------|-----|----------|
| `watchedSeconds` | number | Накопленное время просмотра (берётся максимум с сохранённым) |
| `status` | `not_started` \| `in_progress` \| `completed` | Статус |
| `completed` | boolean | Если `true` — урок завершён (`completedAt` выставляется) |

**Ответ `200`:** актуальная запись `{ id, courseId, lessonId, status, completedAt, watchedSeconds, updatedAt }`.

---

### `POST /app/lessons/:lessonId/homework`

**Заголовок:** `Authorization: Bearer <accessToken>`  
**Тело:** `multipart/form-data` — поле **`file`** (обязательно), опционально **`comment`** (текст для учителя).

Допустимые типы: документы (pdf, doc/docx, odt, rtf, txt, csv и др.), изображения (в т.ч. `image/png`, `image/jpeg`), видео и аудио в распространённых MIME; лимит размера — не меньше `max(UPLOAD_MAX_FILE_MB, UPLOAD_MAX_VIDEO_MB)` (типично до сотен МБ для видео).

Повторная отправка **заменяет** файл; выставленная ранее **оценка сбрасывается** (нужна повторная проверка админом).

**Ответ `200`:** объект сдачи: `id`, **`lessonId`**, `courseId`, `fileUrl`, `originalFilename`, `mimeType`, `sizeBytes`, `studentComment`, `maxPoints`, `points` (null до проверки), `feedback`, `gradedAt`, `createdAt`, `updatedAt`.

---

### `GET /app/lessons/:lessonId/homework`

**Ответ `200`:** `{ submission: null }` если ещё не сдавали; иначе `submission` — те же поля, что после POST.

---

### `GET /app/users/me/certificates`

**Ответ `200`:** массив: `id`, `courseId`, `courseTitle`, `uniqueCode`, `issuedAt`, `pdfUrl`, `createdAt`.

---

## 8. ИИ (студент)

Все маршруты: **`Authorization: Bearer <accessToken>`** (роль `student`). Заголовок `x-user-id` не используется.

**Язык ответов:** опциональное поле **`language`**: `ru` | `kk` в теле (chat, grade-text) или query `?language=` для рекомендаций. Если не указано — берётся **`AI_STUDENT_REPLY_LANGUAGE`** из окружения (**по умолчанию `kk`**). Стиль подстроен под учеников **4–7 классов** (короткие фразы, простые слова).

### `POST /app/ai/chat`

**Тело:**

```json
{
  "lessonId": "uuid",
  "language": "kk",
  "messages": [
    { "role": "user", "content": "Что такое сервопривод?" },
    { "role": "assistant", "content": "…" }
  ]
}
```

`language` опционально (`ru` | `kk`).

**Ответ `200`:**

```json
{ "reply": "Текст ответа ассистента" }
```

**Ошибки:** `401`, `403` (не student), `429` дневной лимит, `503` нет OpenAI.

---

### `POST /app/ai/chat-profile`

Прямой чат в профиле ученика, без привязки к уроку.

**Тело:**

```json
{
  "language": "kk",
  "messages": [
    { "role": "user", "content": "Как лучше подготовиться к контрольной?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

`language` опционально (`ru` | `kk`), по умолчанию — из env `AI_STUDENT_REPLY_LANGUAGE`.

**Ответ `200`:**

```json
{ "reply": "Текст ответа ассистента" }
```

**Ошибки:** `401`, `403` (не student), `429` дневной лимит, `503` нет OpenAI.

---

### `POST /app/ai/chat-course`

Чат по курсу (контекст всех опубликованных секций и уроков курса).

**Тело:**

```json
{
  "courseId": "uuid",
  "language": "kk",
  "messages": [
    { "role": "user", "content": "По этому курсу что важно повторить?" }
  ]
}
```

**Ответ `200`:**

```json
{ "reply": "Текст ответа ассистента" }
```

**Ошибки:** `401`, `403` (не student), `429` дневной лимит, `503` нет OpenAI.

---

### `GET /app/ai/recommendations`

| Query | `courseId` — опционально, UUID; `language` — опционально, `ru` \| `kk` |

**Ответ `200`:**

```json
{
  "weakTopics": ["…"],
  "repeatLessonIds": ["uuid"],
  "suggestedMaterials": ["…"],
  "summary": "Краткий текст для дашборда"
}
```

---

### `POST /app/ai/grade-text`

**Тело:**

| Поле | Тип | Описание |
|------|-----|----------|
| `questionText` | string | Текст вопроса |
| `studentAnswer` | string | Ответ ученика |
| `referenceAnswer` | string | Эталон (с бэка/вопроса) |
| `gradingRubric` | string? | Критерии оценки |
| `language` | `ru` \| `kk`? | Язык поля `feedback` (по умолчанию из env, см. выше) |

**Ответ `200`:**

```json
{
  "score": 78,
  "feedback": "Текст обратной связи"
}
```

`score` — целое 0–100.

---

## 9. Геймификация

Все маршруты: **`Authorization: Bearer <accessToken>`**, роль `student`.

### Система вознаграждений (XP)

| Событие | XP | Примечание |
|---------|-----|------------|
| Урок завершён (`PATCH /app/lessons/.../progress`) | +20 | Первый переход в `completed` |
| Тест сдан успешно | +50 | База |
| + бонус «100%» | +30 | Если процент ответов = 100 |
| + бонус «с первой попытки» | +30 | Если это первая завершённая попытка по этому тесту |
| Сертификат по курсу выдан | +100 | При создании сертификата админом |
| Первая сдача ДЗ по уроку | +10 | Только первая загрузка файла (не повторная замена) |
| ДЗ оценено ≥ 80% от max | +25 | При выставлении оценки админом |
| Новый день подряд (стрик) | +5 | За продление стрика |

Максимум за один тест: **50 + 30 + 30 = 110** XP (если и 100%, и первая попытка).

### Уровни (XP → Level)

Диапазон уровней расширен до **20**. Нижняя граница XP для уровня `N` (накопленный XP ≥ порога):

| Ур. | XP от | Ур. | XP от |
|-----|-------|-----|-------|
| 1 | 0 | 11 | 11 500 |
| 2 | 100 | 12 | 16 000 |
| 3 | 300 | 13 | 22 000 |
| 4 | 600 | 14 | 30 000 |
| 5 | 1 000 | 15 | 40 000 |
| 6 | 1 600 | 16 | 52 000 |
| 7 | 2 400 | 17 | 67 000 |
| 8 | 3 600 | 18 | 85 000 |
| 9 | 5 400 | 19 | 107 000 |
| 10 | 8 000 | 20 | 135 000 |

### Бейджи (`key`)

У каждого бейджа в ответе `GET .../me` есть поля `title`, `description`, **`icon`** (эмодзи для UI).

| Ключ | Условие |
|------|---------|
| `first_module` | Первый завершённый **урок** (ключ в БД прежний) |
| `modules_10` / `modules_50` | 10 / 50 завершённых **уроков** (счётчик по завершённым урокам) |
| `first_quiz_passed` | Первая успешная сдача теста |
| `quizzes_5` / `quiz_master` | 5 / 10 успешных тестов |
| `quiz_perfect` | Тест на 100% |
| `first_attempt_pass` | Успех с первой попытки по тесту |
| `first_course` | Первый сертификат |
| `courses_3` | Три сертификата |
| `homework_first` | Первая сдача ДЗ |
| `homework_5` | Пять сдач ДЗ (по разным урокам) |
| `homework_excellent` | Оценка за ДЗ ≥ 80% |
| `streak_3` / `streak_7` / `streak_30` | Стрик 3 / 7 / 30 дней |

**Миграция БД:** после деплоя нужно применить миграции (`badge_key` дополняется новыми значениями).

---

### `GET /app/gamification/me`

**Заголовок:** `Authorization: Bearer <accessToken>`

**Ответ `200`:**

```json
{
  "xp": 350,
  "level": 3,
  "nextLevelXp": 600,
  "xpInCurrentLevel": 50,
  "xpNeededForNextLevel": 300,
  "levelProgressPercent": 17,
  "streakDays": 4,
  "lastActivityAt": "2025-03-18T09:00:00.000Z",
  "badges": [
    {
      "key": "first_module",
      "title": "Первый шаг",
      "description": "Завершить первый модуль",
      "icon": "🎯",
      "earnedAt": "2025-03-15T12:00:00.000Z"
    }
  ],
  "progressHints": [
    {
      "key": "quizzes_5",
      "title": "5 тестов",
      "icon": "🎓",
      "current": 3,
      "target": 5,
      "percent": 60
    }
  ]
}
```

- `xpInCurrentLevel` — XP накоплено внутри текущего уровня (от его нижней границы).
- `xpNeededForNextLevel` — ширина «полосы» текущего уровня до следующего порога (`null` на максимальном уровне).
- **`levelProgressPercent`** — 0–100, заполненность прогресс-бара уровня.
- **`badges[].icon`** — эмодзи для карточки бейджа.
- **`progressHints`** — только **ещё не полученные** бейджи с числовым условием; отсортированы по убыванию `percent` (ближайшие к получению сверху). Можно показывать как «до бейджа: 3/5».

---

### `GET /app/gamification/leaderboard`

**Query-параметры:**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `schoolId` | UUID | нет | Фильтр по школе; без него — глобальный рейтинг |
| `limit` | number | нет | Кол-во строк (1–100, по умолчанию 20) |

**Ответ `200`:** массив участников рейтинга.

```json
[
  {
    "rank": 1,
    "userId": "uuid",
    "firstName": "Айгерим",
    "lastName": "Сейткали",
    "avatarUrl": "…",
    "xp": 1200,
    "level": 6,
    "streakDays": 12
  }
]
```

---

### `GET /app/gamification/my-rank`

**Query-параметры:**

| Поле | Тип | Описание |
|------|-----|----------|
| `schoolId` | UUID | Необязательно. Если передать — ранг считается только среди учеников этой школы (удобно: `schoolId` из профиля). Без параметра — глобальный рейтинг. |

**Ответ `200`:**

```json
{
  "rank": 42,
  "total": 1200,
  "xp": 350,
  "level": 3,
  "streakDays": 4
}
```

- `rank` — место (1 = лидер по XP в выбранной выборке), `total` — сколько участников в этой выборке.

---

## 10. Коды ошибок (общие)

| HTTP | Когда |
|------|--------|
| `400` | Невалидное тело (ValidationPipe) |
| `401` | Не авторизован / неверный логин |
| `403` | Нет доступа к курсу / лимит устройств |
| `404` | Ресурс не найден |
| `429` | Лимиты ИИ |
| `503` | Сервис недоступен (например OpenAI) |

---

*Краткий реестр путей без тел запросов: `docs/API-STRUCTURE.md`. При расхождении с реальным ответом приоритет у ответа сервера.*
