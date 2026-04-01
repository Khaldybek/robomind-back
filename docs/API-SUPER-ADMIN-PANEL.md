# API панели супер-администратора (Super Admin)

Роль: **`super_admin`**. Полный доступ по платформе: гео, школы, курсы, модули, контент, загрузки, ИИ, **все** пользователи и нарушения по устройствам.

База: **`{ORIGIN}/api/v1`**

**Авторизация:** `Authorization: Bearer <access_token>`  
**Отладка:** `x-user-id` там, где ещё не перевели на JWT.

**Вход:** `POST /auth/login` — без `deviceId`.

---

## 1. Вход

### `POST /auth/login`

| Поле | Обязательно |
|------|-------------|
| `email` | да |
| `password` | да |

**Ответ `200`:** `user.role === "super_admin"`, далее JWT.

---

## 2. Гео и школы

Все маршруты: **`Authorization: Bearer <accessToken>`**, роль **`super_admin`**. Иначе `401` / `403`.

Миграция **`DistrictIsActive`** добавляет `is_active` у районов — выполните `npm run migration:run`.

### Объекты в ответах

**Город** (`City`):

```json
{
  "id": "uuid",
  "name": "Алматы",
  "nameKz": "Алматы",
  "isActive": true,
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```

**Район** (`District`):

```json
{
  "id": "uuid",
  "cityId": "uuid",
  "name": "Ауэзовский район",
  "nameKz": "…",
  "isActive": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

**Школа** (`School`):

```json
{
  "id": "uuid",
  "districtId": "uuid",
  "name": "Школа №12",
  "number": 12,
  "address": "ул. …",
  "isActive": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

`nameKz`, `number`, `address` могут быть `null`.

---

### Города

| Метод | Путь | HTTP | Тело ответа |
|-------|------|------|-------------|
| GET | `/admin/cities?page=1&limit=20&search=&isActive=true` | 200 | См. ниже **список** |
| GET | `/admin/cities/:id` | 200 | Один объект **Город** |
| POST | `/admin/cities` | 201 | Созданный **Город** |
| PATCH | `/admin/cities/:id` | 200 | Обновлённый **Город** |
| DELETE | `/admin/cities/:id` | 204 | Пусто. `409` если есть районы |

**GET `/admin/cities` — ответ 200:**

```json
{
  "items": [ { "id", "name", "nameKz", "isActive", "createdAt", "updatedAt" } ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### Районы

| Метод | Путь | HTTP | Тело ответа |
|-------|------|------|-------------|
| GET | `/admin/districts?cityId=uuid&page=&limit=&search=&isActive=` | 200 | **Список районов** (как у городов: `items`, `total`, `page`, `limit`, `totalPages`) |
| GET | `/admin/districts/:id` | 200 | Один **Район** |
| POST | `/admin/districts` | 201 | Созданный **Район** |
| PATCH | `/admin/districts/:id` | 200 | Обновлённый **Район** |
| DELETE | `/admin/districts/:id` | 204 | Пусто. `409` если есть школы |

Элементы `items` — те же поля, что в объекте **Район** выше.

---

### Школы

| Метод | Путь | HTTP | Тело ответа |
|-------|------|------|-------------|
| GET | `/admin/schools?districtId=uuid&page=&limit=&search=&isActive=` | 200 | **Список школ** (`items`, `total`, `page`, `limit`, `totalPages`) |
| GET | `/admin/schools/:id` | 200 | Одна **Школа** |
| POST | `/admin/schools` | 201 | Созданная **Школа** |
| PATCH | `/admin/schools/:id` | 200 | Обновлённая **Школа** |
| DELETE | `/admin/schools/:id` | 204 | Пусто. `409` если есть пользователи с этой школой |

Элементы `items` — объект **Школа** как выше.

---

### Ошибки (JSON)

| Код | Когда |
|-----|--------|
| 400 | Нет `cityId` / `districtId` в GET-списках, невалидные query |
| 401 | Нет или просрочен Bearer |
| 403 | Не `super_admin` |
| 404 | Неверный `:id` |
| 409 | DELETE города/района/школы при связанных записях |

---

## 3. Школьные админы (по школам)

Только **`super_admin`**. Создание и ведение администраторов школ (`role: school_admin`), привязанных к **`schoolId`**.

### Объект в ответах

| Поле | Описание |
|------|----------|
| `id`, `email`, `firstName`, `lastName`, `patronymic`, `iin` | |
| `role` | всегда `school_admin` |
| `schoolId` | uuid школы |
| `school` | `{ id, name, number }` |
| `isActive` | |
| `createdAt`, `updatedAt` | |

Пароль **никогда** не возвращается.

---

### `GET /admin/school-admins`

**Query (обязательно):** `schoolId`  
**Опционально:** `page`, `limit` (max 100), `search` (email, ФИО), `isActive`

**200:** `{ items[], total, page, limit, totalPages }`  
**404** — школы нет.

---

### `GET /admin/schools/:schoolId/admins`

То же, что `GET /admin/school-admins?schoolId=…`: список школьных админов **по выбранной школе**.  
**Query:** `page`, `limit`, `search`, `isActive` (без `schoolId` — он в пути).

**200** / **404** — как выше.

---

### `POST /admin/school-admins`

**Тело:**

| Поле | Обяз. |
|------|--------|
| `schoolId` | да |
| `email` | да |
| `password` | да, мин. 8 символов |
| `firstName`, `lastName` | да |
| `patronymic` | нет |
| `iin` | да, 12 цифр |

**201** — созданный объект. **409** — email или ИИН уже заняты.

---

### `GET /admin/school-admins/:id`

**200** — один школьный админ. **404** — не найден или не `school_admin`.

---

### `PATCH /admin/school-admins/:id`

Частично: `schoolId` (перевод в другую школу), `email`, `password`, ФИО, `iin`, `isActive`.

**200** — обновлённый объект. **409** — конфликт email/ИИН.

---

### `DELETE /admin/school-admins/:id`

**204** — аккаунт **деактивирован** (`isActive: false`), запись в БД сохраняется.

---

## 4. Пользователи (все школы)

**`super_admin`**, `Authorization: Bearer`.

### Объект пользователя (без пароля)

| Поле | |
|------|---|
| `id`, `iin`, `email`, `firstName`, `lastName`, `patronymic` | |
| `role` | `student` \| `school_admin` \| `super_admin` |
| `schoolId` | uuid \| null |
| `school` | `{ id, name, number }` \| null |
| `isActive`, `avatarUrl`, `createdAt`, `updatedAt` | |

У `super_admin` всегда `schoolId: null`. Для `student` / `school_admin` нужен `schoolId`.

---

### `GET /admin/users`

**Query:** `page`, `limit`, `schoolId`, `role`, `search` (email, ФИО, ИИН), `isActive`

**200:** `{ items[], total, page, limit, totalPages }`

---

### `GET /admin/users/:userId`

**200** — один пользователь. **404**

---

### `PUT /admin/users/:userId`

Частичное обновление: `email`, `password`, ФИО, `iin`, `role`, `schoolId`, `isActive`, `avatarUrl`.  
При смене роли на `super_admin` школа сбрасывается.

**409** — занят email или ИИН.

---

### `PATCH /admin/users/:userId/activate`

**200** — `isActive: true`.

---

### `GET /admin/users/:userId/progress`

**200:** массив прогресса по модулям: `courseId`, `courseTitle`, `moduleId`, `moduleTitle`, `status`, `completedAt`, `watchedSeconds`, даты.

---

### `GET /admin/users/:userId/certificates`

**200:** массив: `courseId`, `courseTitle`, `issuedAt`, `pdfUrl`, `uniqueCode`, `createdAt`.

---

## 5. Курсы и доступы

**`Authorization: Bearer`**, роль **`super_admin`**.

### Объект курса в ответах

Один элемент списка, `GET :id`, `POST`, `PATCH` — одна схема:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | |
| `title` | string | |
| `description` | string \| null | |
| `level` | string | `beginner` \| `intermediate` \| `advanced` |
| `isPublished` | boolean | |
| `order` | number | сортировка в каталоге |
| `createdAt`, `updatedAt` | ISO datetime | |
| `thumbnailUrl` | string \| null | обложка |
| `ageGroup` | string \| null | возрастная метка |
| `moduleCount` | number | число модулей |
| `studentsCount` | number | уникальные студенты: активный доступ **или** любой прогресс по курсу |

---

### `GET /admin/courses`

**Query:** `page` (default 1), `limit` (default 20, max 100), `search` (по `title` ILIKE), `isPublished` (`true`/`false`), `level` (`beginner`…), `sort`:

| `sort` | Поведение |
|--------|-----------|
| `order_asc` | по умолчанию: `order` ↑, затем `title` |
| `order_desc` | `order` ↓ |
| `title_asc` / `title_desc` | по названию |
| `createdAt_asc` / `createdAt_desc` | по дате создания |

**Ответ `200`:**

```json
{
  "items": [ { "...": "объект курса" } ],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### `GET /admin/courses/:courseId`

**Ответ `200`:** объект курса (полный, с `moduleCount`, `studentsCount`).  
**404** — нет курса.

---

### `POST /admin/courses`

**Content-Type:** `application/json` **или** `multipart/form-data`.

**JSON:** тело как таблица ниже.

**Форма (multipart):** те же поля текстовыми полями формы + опционально файл обложки в поле **`thumbnail`** (jpeg/png/gif/webp/svg, лимит см. `UPLOAD_MAX_IMAGE_MB`). После сохранения в `thumbnailUrl` попадает путь вида `/api/v1/files/images/<uuid>.<ext>` (тот же хост, что у API). Если передан **`thumbnail`**, поле **`thumbnailUrl`** в теле игнорируется.

| Поле | Обяз. | |
|------|-------|---|
| `title` | да | |
| `level` | да | `beginner` \| `intermediate` \| `advanced` |
| `description` | нет | |
| `isPublished` | нет | default `false` |
| `order` | нет | default `0` |
| `thumbnail` | нет | только в multipart — файл картинки |
| `thumbnailUrl`, `ageGroup` | нет | URL обложки (если файл не загружали) |

**Ответ `201`:** созданный курс (включая `moduleCount: 0`, `studentsCount: 0`).

---

### `PATCH /admin/courses/:courseId`

**Content-Type:** `application/json` **или** `multipart/form-data`.

Частичное обновление: любое из `title`, `description` (в т.ч. `null`), `level`, `isPublished`, `order`, `thumbnailUrl`, `ageGroup` (`null` — очистить). В multipart можно передать только **`thumbnail`** — обложка обновится; при наличии файла **`thumbnailUrl`** из полей формы перезаписывается сохранённым URL.

**Ответ `200`:** обновлённый объект курса.

---

### `DELETE /admin/courses/:courseId`

**204** — курс удалён (только если **нет** модулей и **нет** студентов по метрике выше).

**409** — есть модули или студенты; текст подсказывает снять с публикации или убрать модули/доступ.

---

### `GET /admin/courses/:courseId/modules`

Те же query, что у `GET /admin/modules`, но **`courseId` в пути** (не в query): `page`, `limit`, `search`, `isPublished`, `sort`.

**200:** как `GET /admin/modules?courseId=…`

---

### `POST /admin/courses/:courseId/access`

Выдача доступа **ученику** (`role: student`).

**Тело:** `userId`, `accessType` (`permanent` \| `temporary`), опц. `expiresAt` (ISO).

**201** — запись доступа. **409** — уже есть активный доступ. **404** — курс или пользователь не найден.

---

### `DELETE /admin/courses/:courseId/access/:userId`

Отзыв доступа (`revoked_at = now()`). **204**

---

### `GET /admin/courses/:courseId/students`

Студенты с **активным доступом** к курсу **или** с любым **прогрессом** по курсу.

**200:** `[{ id, email, firstName, lastName, schoolId, isActive }, …]`

---

## 6. Модули и контент

Роль **`super_admin`**, `Authorization: Bearer`.

### Объект модуля (список / карточка / POST / PATCH)

| Поле | Тип |
|------|-----|
| `id`, `courseId` | uuid |
| `title` | string |
| `description` | string \| null |
| `order` | number |
| `isPublished` | boolean |
| `unlockAfterModuleId` | uuid \| null |
| `createdAt`, `updatedAt` | ISO datetime |
| `contentCount` | число блоков контента |
| `progressCount` | уникальные студенты с прогрессом по модулю |
| `hasQuiz` | boolean |
| `quizId` | uuid \| null |

### Объект блока контента (`module_contents`)

| Поле | Тип |
|------|-----|
| `id`, `moduleId` | uuid |
| `type` | `video` \| `image` \| `file` \| `text` \| `livestream` \| `link` |
| `title`, `content`, `fileUrl`, `livestreamUrl` | string \| null |
| `duration`, `order` | number |
| `livestreamStartsAt` | ISO datetime \| null |
| `createdAt`, `updatedAt` | ISO datetime |

---

### `GET /admin/modules`

**Query (обяз.):** `courseId`  
**Опционально:** `page`, `limit` (max 100), `search` (по `title`), `isPublished`, `sort`: `order_asc` (default), `order_desc`, `title_asc`/`title_desc`, `createdAt_asc`/`createdAt_desc`.

**Ответ `200`:** `{ items: [модуль…], total, page, limit, totalPages }`  
**404** — курс не найден.

---

### `GET /admin/modules/:moduleId`

**200** — один модуль (поля как выше). **404** — нет модуля.

---

### `POST /admin/modules`

**Тело:** `courseId`, `title`; опц. `description`, `order` (0), `isPublished` (false), `unlockAfterModuleId` (тот же курс).

**201** — созданный модуль (`contentCount: 0`, …).

---

### `PATCH /admin/modules/:moduleId`

Частично: `title`, `description`, `order`, `isPublished`, `unlockAfterModuleId` (в т.ч. `null`).

**200** — обновлённый модуль.

---

### `DELETE /admin/modules/:moduleId`

**204** — удалён (каскадом уходят контент и тест без попыток).  
**409** — есть прогресс студентов по модулю **или** есть попытки `quiz_attempts` по тесту этого модуля.

---

### `GET /admin/modules/:moduleId/contents`

**200** — массив блоков контента, сортировка по `order`, `id`.

---

### `POST /admin/modules/:moduleId/contents/from-file` *(рекомендуется для фото/видео/файла)*

**`multipart/form-data`:** обязательно поле **`file`** (бинарник) и **`type`**: `image` \| `video` \| `file`  
Опционально: `title`, `order`, `content` (подпись/описание).

Файл сохраняется на сервере, в блоке проставляется **`fileUrl`** вида `/api/v1/files/images/...` (без внешних URL).

**201** — созданный блок.

---

### `POST /admin/modules/:moduleId/contents`  
### `POST /admin/modules/:moduleId/content` *(тот же обработчик)*

**Тело (JSON):** обяз. `type`; опц. `title`, `content`, `fileUrl`, `duration`, `order`, `livestreamUrl`, `livestreamStartsAt`.

**Фото (`type: image`):** нельзя указывать внешний `http(s)` URL. Нужен путь после загрузки: **`/api/v1/files/images/...`** (или сначала `POST /admin/upload/image`, затем вставить `url` из ответа). Удобнее — **`POST .../contents/from-file`** с файлом.

**201** — созданный блок.

---

### `PATCH /admin/modules/:moduleId/contents/:contentId`

Частичное обновление полей блока (в т.ч. `null` для очистки строк / `livestreamStartsAt`).

**200** — блок. **404** — нет блока или не тот `moduleId`.

---

### `DELETE /admin/modules/:moduleId/contents/:contentId`

**204**. **404** — нет блока.

---

### Тесты (квизы) модуля

Префикс **`/admin`**, **`super_admin`**.

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/admin/modules/:moduleId/quiz` | Полное дерево теста с вопросами и ответами или `null` |
| POST | `/admin/modules/:moduleId/quiz` | Создать тест (один на модуль): `title`, `passingScore`, опц. `maxAttempts`, `timeLimitMinutes`, `shuffleQuestions` |
| PATCH | `/admin/quizzes/:quizId` | Настройки теста |
| DELETE | `/admin/quizzes/:quizId` | **204**; **409** если есть `quiz_attempts` |
| POST | `/admin/quizzes/:quizId/questions` | Вопрос: `text`, `type` (`single`\|`multiple`\|`text`), `order`, `imageUrl`, `answers[]` `{ text, isCorrect }` |
| PATCH | `/admin/questions/:questionId` | |
| DELETE | `/admin/questions/:questionId` | **204** |
| POST | `/admin/questions/:questionId/answers` | Добавить вариант ответа |
| PATCH | `/admin/answers/:answerId` | |
| DELETE | `/admin/answers/:answerId` | **204** |

---

## 7. Загрузки (супер-админ)

`multipart/form-data`, поле **`file`**. После загрузки подставьте **`url`** в блок контента:

| Тип блока | Поле в блоке | Загрузка |
|-----------|----------------|----------|
| `image` | `fileUrl` | `POST /admin/upload/image` |
| `video` | `fileUrl` | `POST /admin/upload/video` |
| `file` | `fileUrl` | `POST /admin/upload/file` |

Можно вместо загрузки указать **любой внешний URL** в `fileUrl` (CDN, YouTube не в fileUrl — для ссылок тип `link` + `content`).

Файлы отдаются по **`GET {origin}{url}`**, например `/api/v1/files/videos/<uuid>.mp4` (без отдельного JWT для чтения — при необходимости позже закрыть).

**Переменные:** `UPLOAD_DIR` (папка, по умолчанию `uploads`), лимиты МБ: `UPLOAD_MAX_IMAGE_MB`, `UPLOAD_MAX_VIDEO_MB`, `UPLOAD_MAX_FILE_MB`.

### `POST /admin/upload/image`

Допустимые MIME: jpeg, png, gif, webp, svg.

**Ответ `201`:** `{ "url", "mimeType", "size", "originalName", "storedName" }`

### `POST /admin/upload/video`

mp4, webm, mov и др.

**Ответ `201`:** как у image.

### `POST /admin/upload/file`

pdf, zip, doc/docx, ppt, xlsx и т.п.

**Ответ `201`:** как у image.

---

## 8. ИИ (админ) — реализовано

**`Authorization: Bearer`**, только **`super_admin`**.

### `POST /admin/ai/quiz/generate`

**Тело (JSON):**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `moduleId` | uuid | одно из: `moduleId` **или** `moduleText` |
| `moduleText` | string ≥80 симв. | см. выше |
| `questionCount` | int 1–25 | да |
| `difficulty` | `easy` \| `medium` \| `hard` | нет |

**Ответ `200`:**

```json
{
  "questions": [
    {
      "text": "…",
      "type": "single | multiple",
      "answers": [
        { "text": "…", "isCorrect": true },
        { "text": "…", "isCorrect": false }
      ]
    }
  ]
}
```

---

### `POST /admin/ai/summarize`

**Тело:**

| Поле | Описание |
|------|----------|
| `moduleId` | uuid — взять текст из модулей |
| `text` | string ≥40 — или сырой текст |

**Ответ `200`:** `{ "summary": "3–5 предложений…" }`

---

### `POST /admin/ai/transcribe`

**Тело:** `multipart/form-data`, поле **`file`**, опционально **`language`**: `ru` | `kk` | `auto`.

**Ответ `200`:**

```json
{
  "text": "Полная транскрипция",
  "vtt": "WEBVTT\n\n…",
  "language": "ru"
}
```

---

## 9. Устройства и уведомления (как у школы, но **все** школы)

**`Authorization: Bearer`**. Роли **`super_admin`** (все школы) или **`school_admin`** (только своя школа). Заголовок `x-user-id` больше не требуется.

### `GET /admin/device-violations`

**Все** нарушения лимита устройств по платформе.

*Формат ответа — как в `API-SCHOOL-ADMIN-PANEL.md`, массив с `student`.*

---

### `GET /admin/notifications`

### `PATCH /admin/notifications/:id/read`

### `GET /admin/users/:userId/devices`

Любой ученик.

### `DELETE /admin/users/:userId/devices/:deviceId`

---

## 10. Сводка: только супер-админ

| Метод | Путь |
|-------|------|
| POST | `/admin/cities`, `/admin/districts`, `/admin/schools` |
| GET | `/admin/school-admins`, `/admin/schools/:schoolId/admins` — админы школы |
| POST/PATCH/DELETE | `/admin/school-admins` |
| GET/PUT/PATCH | `/admin/users` — пользователи, прогресс, сертификаты |
| GET/POST/PATCH/DELETE | `/admin/courses`, доступы, студенты курса |
| GET/POST/PATCH/DELETE | `/admin/modules`, контент; `/admin/modules/.../quiz`, `/admin/quizzes/...` |
| POST | `/admin/upload/video`, `/admin/upload/file` |
| POST | `/admin/ai/quiz/generate`, `/admin/ai/summarize`, `/admin/ai/transcribe` |

Школьный админ эти маршруты **не вызывает** (403 после внедрения guards).

---

## 11. Ошибки

| Код | Когда |
|-----|--------|
| `400` | Валидация, нет текста для ИИ |
| `401` / `403` | Не супер-админ |
| `503` | OpenAI недоступен |

---

*Часть CRUD помечена как целевой контракт до полной реализации сервисов.*
