# API администратора школы (`school_admin`) — контракт бэкенда

База: **`{ORIGIN}/api/v1`**

**Авторизация:** `Authorization: Bearer <access_token>` (JWT после `POST /auth/login` **без** `deviceId`).

В JWT у пользователя с ролью `school_admin` в payload/профиле есть **`schoolId`** — все данные ограничены этой школой.

---

## Общие правила

| Код | Когда |
|-----|--------|
| **401** | Нет/просрочен токен |
| **403** | Роль не подходит; ученик не из вашей школы; запрещённое действие |
| **404** | Сущность не найдена или **скрыта** (например, неопубликованный курс для школьного админа) |

- Список пользователей `/admin/users` — **только ученики (`student`) своей школы**; в списке **ИИН маскируется** строкой `••••••••••••`.
- В карточке ученика `GET /admin/users/:id` ИИН возвращается **полностью** (для работы администратора).
- Курсы: видны **только опубликованные** (`isPublished: true`). Создание/редактирование/удаление курсов — **только у супер-админа** (у школьного — `403`).
- Модули курса: в `GET .../courses/:courseId/modules` возвращаются **только опубликованные модули** опубликованного курса.
- В списке и карточке курса поле **`studentsCount`** для `school_admin` считается **только по ученикам вашей школы** (доступ или прогресс по курсу). У супер-админа — по всей платформе.

---

## 1. Вход

### `POST /auth/login`

**Тело (JSON):**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `email` | string | да |
| `password` | string | да |

`deviceId` **не** передаётся.

**Ответ `200`:**

| Поле | Описание |
|------|----------|
| `accessToken` | JWT |
| `refreshToken` | строка |
| `expiresIn` | секунды access |
| `tokenType` | `"Bearer"` |
| `user` | объект пользователя, ожидается `role: "school_admin"`, `schoolId: "<uuid>"` |

---

## 2. Своя школа

### `GET /admin/my-school`

**Роль:** только `school_admin`.

**Запрос:** без тела.

**Ответ `200`:**

```json
{
  "school": {
    "id": "uuid",
    "districtId": "uuid",
    "name": "string",
    "number": 12,
    "address": "string | null",
    "isActive": true,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "district": {
    "id": "uuid",
    "cityId": "uuid",
    "name": "string",
    "nameKz": "string | null",
    "isActive": true,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "city": {
    "id": "uuid",
    "name": "string",
    "nameKz": "string | null",
    "isActive": true,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
}
```

`district` / `city` могут быть `null`, если связи нет в БД.

**403** — у пользователя нет `schoolId`.

---

## 2a. Текущий пользователь (JWT)

### `GET /admin/me`

**Роли:** `school_admin` | `super_admin`.

**Запрос:** без тела.

**Ответ `200`:** полный профиль из БД (без пароля):

| Поле | Описание |
|------|----------|
| `id`, `email`, `firstName`, `lastName`, `patronymic`, `iin` | |
| `role` | `school_admin` или `super_admin` |
| `isActive` | boolean |
| `schoolId` | uuid \| null |
| `school` | `{ id, name, number, districtId }` \| null |
| `avatarUrl` | string \| null |
| `createdAt`, `updatedAt` | ISO |

---

## 2b. Сводка по школе

### `GET /admin/school/stats`

**Роль:** только `school_admin`.

**Запрос:** без тела.

**Ответ `200`:**

```json
{
  "schoolId": "uuid",
  "students": {
    "total": 0,
    "active": 0,
    "inactive": 0
  },
  "courseAccess": {
    "activeRows": 0,
    "coursesWithAccess": 0
  },
  "deviceViolationsTotal": 0,
  "unreadNotificationsForCurrentAdmin": 0,
  "generatedAt": "ISO-8601"
}
```

| Поле | Смысл |
|------|--------|
| `courseAccess.activeRows` | число активных строк в `course_accesses` у учеников школы |
| `courseAccess.coursesWithAccess` | сколько **разных курсов** имеют хотя бы одного ученика школы с активным доступом |
| `unreadNotificationsForCurrentAdmin` | непрочитанные уведомления **текущего** админа |

**403** — нет `schoolId` у пользователя.

---

## 3. Ученики школы (`/admin/users`)

### `GET /admin/users`

**Query:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | по умолчанию 1 |
| `limit` | number | по умолчанию 20, макс. 100 |
| `search` | string | по email, ФИО, ИИН (частичное совпадение) |
| `isActive` | boolean | фильтр по активности |

Поля `schoolId` и `role` из query **игнорируются** — всегда подставляется школа JWT и роль `student`.

**Ответ `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "iin": "••••••••••••",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "patronymic": "string | null",
      "role": "student",
      "isActive": true,
      "schoolId": "uuid",
      "school": { "id": "uuid", "name": "string", "number": 12 },
      "avatarUrl": "string | null",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "total": 0,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### `GET /admin/users/export`

**Роль:** только `school_admin`.

**Запрос:** без тела.

**Ответ `200`:** файл **`text/csv; charset=utf-8`**, заголовок `Content-Disposition: attachment; filename="students.csv"`. Первая строка — BOM (`\uFEFF`) для Excel.

**Колонки:** `email`, `firstName`, `lastName`, `iin`, `isActive`, `createdAt` (ISO).

**403** — не `school_admin`.

---

### `POST /admin/users/import`

**Роль:** только `school_admin`.

**Запрос:** `multipart/form-data`, поле файла: **`file`** (один файл `.xlsx`).

**Ограничения:** размер файла до **5 МБ**; не более **500** строк с данными (считая со 2-й строки листа). Берётся **первый лист** книги.

**Первая строка — заголовки колонок** (названия можно на русском или английском, регистр не важен):

| Обязательно | Примеры заголовков |
|-------------|-------------------|
| ИИН (12 цифр) | `ИИН`, `iin` |
| Email | `email`, `почта` |
| Имя | `Имя`, `firstName`, `first name` |
| Фамилия | `Фамилия`, `lastName`, `last name` |
| Отчество (необязательно) | `Отчество`, `patronymic` |

**Данные со 2-й строки.** Пустые строки пропускаются. ИИН лучше хранить в Excel как **текст**, иначе ведущие нули могут потеряться.

**Ответ `200`:**

```json
{
  "summary": {
    "totalRows": 10,
    "created": 8,
    "failed": 2
  },
  "created": [
    {
      "sheetRow": 2,
      "id": "uuid",
      "email": "user@example.com",
      "iin": "123456789012",
      "firstName": "…",
      "lastName": "…",
      "patronymic": null,
      "temporaryPassword": "одноразовый пароль только в этом ответе"
    }
  ],
  "errors": [
    {
      "sheetRow": 5,
      "email": "bad@",
      "iin": "123456789012",
      "message": "Некорректный email"
    }
  ]
}
```

`temporaryPassword` **не возвращается** ни в списках пользователей, ни в БД; администратор передаёт его ученику один раз. Строки с ошибками **не** создают пользователя; остальные строки обрабатываются независимо.

**400** — нет файла, неверный формат, нет нужных колонок, пустой лист. **403** — не `school_admin` или нет `schoolId`.

---

## 3b. Домашние задания и журнал оценок

Все маршруты: **`Authorization: Bearer`**, роли **`school_admin`** | **`super_admin`** (где указано иначе — см. текст).

### `GET /admin/homework-submissions`

**Query (обязательно):** `moduleId` (uuid модуля).

**Опционально:** `page`, `limit` (по умолчанию 20, макс. 100), `search` — по email / ФИО / ИИН ученика.

Для **`super_admin`** обязательно: **`schoolId`** — школа, по которой фильтровать учеников.

Для **`school_admin`** список сдач только учеников **вашей школы** по указанному модулю.

**Ответ `200`:** `module` (кратко о модуле и курсе), `items[]` (сдачи с полями пользователя, файла, `points` / `feedback` / `gradedAt`), пагинация `total`, `page`, `limit`, `totalPages`.

---

### `PATCH /admin/homework-submissions/:submissionId`

**Тело (JSON):**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `points` | number (целое ≥ 0) | да |
| `maxPoints` | number | нет (по умолчанию текущее или 100) |
| `feedback` | string | нет комментарий ученику |

**Ответ `200`:** обновлённые поля оценки (`points`, `maxPoints`, `feedback`, `gradedAt`, `gradedByUserId`).

**403** — сдача не от ученика вашей школы (`school_admin`).

---

### `GET /admin/modules/:moduleId/grade-overview`

Сводка по **ученикам школы, у которых есть доступ к курсу этого модуля**: для каждого — **лучшая по баллам завершённая попытка теста** (если есть) и **сдача домашки** (если есть).

**Query:** для **`super_admin`** обязательно **`schoolId`**. Для **`school_admin`** школа берётся из JWT.

**Ответ `200`:** `module`, `quiz` (метаданные теста модуля или `null`), `rows[]` с полями `user`, `quiz` (баллы теста), `homework` (файл и оценка или `null`).

---

### `GET /admin/users/:userId`

**Ответ `200`:** тот же объект пользователя, что и в списке, но **`iin` без маски** (12 цифр).

**403** — пользователь не ученик или не вашей школы.

---

### `PUT /admin/users/:userId`

Частичное обновление. **Разрешённые поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `firstName` | string | опционально |
| `lastName` | string | опционально |
| `patronymic` | string \| null | опционально |
| `isActive` | boolean | опционально |
| `avatarUrl` | string \| null | опционально |
| `password` | string | опционально, мин. 8 символов — смена пароля ученика |

**Запрещено** (иначе **403**): `email`, `iin`, `role`, `schoolId`.

**Ответ `200`:** обновлённый пользователь (ИИН полный).

---

### `PATCH /admin/users/:userId/activate`

Выставляет `isActive: true`.

**Ответ `200`:** объект пользователя.

**403** — нет доступа к ученику.

---

### `DELETE /admin/users/:userId`

**403** для администратора школы (удаление только у супер-админа).

---

### `GET /admin/users/:userId/progress`

**Ответ `200`:** массив объектов:

| Поле | Тип |
|------|-----|
| `id` | uuid |
| `courseId` | uuid |
| `courseTitle` | string \| null |
| `moduleId` | uuid |
| `moduleTitle` | string \| null |
| `status` | enum прогресса |
| `completedAt` | ISO \| null |
| `watchedSeconds` | number |
| `createdAt`, `updatedAt` | ISO |

---

### `GET /admin/users/:userId/certificates`

**Ответ `200`:** массив:

| Поле | Тип |
|------|-----|
| `id` | uuid |
| `courseId` | uuid |
| `courseTitle` | string \| null |
| `issuedAt` | ISO |
| `pdfUrl` | string \| null |
| `uniqueCode` | string |
| `createdAt` | ISO |

---

### `GET /admin/users/:userId/quiz-attempts`

Попытки прохождения тестов ученика (метаданные и баллы; **тексты ответов не отдаются**).

**Ответ `200`:** массив объектов:

| Поле | Тип |
|------|-----|
| `id` | uuid попытки |
| `quizId` | uuid |
| `userId` | uuid |
| `score`, `maxScore` | number |
| `isPassed` | boolean |
| `startedAt`, `completedAt` | ISO \| null |
| `hasStoredAnswers` | boolean — есть ли сохранённые ответы после завершения |
| `courseId`, `courseTitle` | uuid \| string \| null |
| `moduleId`, `moduleTitle` | uuid \| string \| null |
| `quizTitle` | string \| null |
| `createdAt` | ISO |

**403** — ученик не из вашей школы (для `school_admin`).

---

## 4. Курсы (чтение + доступы)

### `GET /admin/courses`

Список **только опубликованных** курсов.

**Query:** как у супер-админа (`page`, `limit`, `search`, `level`, `sort`). Фильтр `isPublished` не нужен — всегда опубликованные.

**Ответ `200`:** `{ items[], total, page, limit, totalPages }` — элементы как у админки курса (`id`, `title`, `description`, `level`, `isPublished`, `order`, `thumbnailUrl`, `ageGroup`, `moduleCount`, **`studentsCount` (только ученики школы)**, даты).

---

### `GET /admin/courses/:courseId`

Один курс. Неопубликованный курс → **404**.

---

### `GET /admin/courses/:courseId/modules`

Список **всех секций (модулей) курса** при условии, что курс **опубликован** в каталоге — в том числе с `isPublished: false` (черновики), чтобы школа могла просмотреть полную структуру перед выдачей доступа.

**Query:** `page`, `limit`, `search`, `sort` (как в админке модулей).

**Ответ `200`:** `{ items[], total, page, limit, totalPages }` с полями модуля (`id`, `courseId`, `title`, `description`, `order`, `isPublished`, `unlockAfterCourseModuleId`, `lessonCount`, даты).

---

### Просмотр материалов уроков (`school_admin`, только чтение)

Доступно при **опубликованном курсе** (`courses.is_published = true`). Статусы **секции** и **урока** (`isPublished`) не ограничивают чтение: видны черновики так же, как опубликованные.

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/admin/course-modules/:courseModuleId` | Карточка секции (в т.ч. черновик), если курс опубликован |
| GET | `/admin/lessons?courseModuleId=…` | Список **всех** уроков секции (в т.ч. черновики) |
| GET | `/admin/lessons/:lessonId` | Метаданные урока: `id`, `courseModuleId`, `title`, `description`, `order`, `isPublished`, `unlockAfterLessonId`, `contentCount`, `progressCount`, `hasQuiz`, `quizId`, даты |
| GET | `/admin/lessons/:lessonId/contents` | Блоки контента **полностью**, как у супер-админа при чтении: `id`, `lessonId`, `type`, `title`, **`content`** (HTML/текст), **`fileUrl`**, `duration`, `order`, `livestreamUrl`, `livestreamStartsAt`, `createdAt`, `updatedAt` |
| GET | `/admin/lessons/:lessonId/quiz` | Тест с вопросами и **`isCorrect`** у вариантов ответа (для проверки методички) |

Запись контента, PATCH/DELETE уроков и квиза — по-прежнему **только `super_admin`**.

---

### `GET /admin/courses/:courseId/students`

Ученики **вашей школы**, у которых есть доступ к курсу или прогресс по курсу.

**Ответ `200`:**

```json
[
  {
    "id": "uuid",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "schoolId": "uuid",
    "isActive": true
  }
]
```

---

### `GET /admin/courses/:courseId/accesses`

Записи доступа к курсу **только для учеников вашей школы**.

**Query:** `page`, `limit`.

**Ответ `200`:** `{ items[], total, page, limit, totalPages }` — элементы:

| Поле | Описание |
|------|----------|
| `id` | uuid записи доступа |
| `courseId`, `userId` | uuid |
| `accessType` | `permanent` \| `temporary` |
| `expiresAt`, `revokedAt` | ISO \| null |
| `grantedBy` | uuid \| null |
| `createdAt` | ISO |
| `user` | кратко: id, email, firstName, lastName |
| `grantedByUser` | если есть: id, email |

---

### `POST /admin/courses/:courseId/access`

Выдача доступа ученику **вашей школы** к **опубликованному** курсу.

**Тело:**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `userId` | uuid | да, роль пользователя — `student`, та же школа |
| `accessType` | `permanent` \| `temporary` | да |
| `expiresAt` | ISO string | для `temporary` — логически нужен срок |

**Ответ `201`:** объект записи доступа (как элемент в `listAccesses`). В БД в поле `grantedBy` сохраняется **ваш** `userId`.

**403** — ученик не из школы. **404** — курс не найден / не опубликован.

---

### `POST /admin/courses/:courseId/access/bulk`

Массовая выдача доступа тем же правилам, что и одиночная.

**Тело:**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| `userIds` | uuid[] | да, 1…200 уникальных id, без дубликатов в теле |
| `accessType` | `permanent` \| `temporary` | да |
| `expiresAt` | ISO string | опционально |

**Ответ `201`:**

```json
{
  "grantedCount": 2,
  "granted": [ { "...": "как у POST .../access" } ],
  "errors": [
    { "userId": "uuid", "code": "already_active" },
    { "userId": "uuid", "code": "not_found" }
  ]
}
```

- `already_active` — уже есть неотозванный доступ.
- `not_found` — пользователь не найден (или не подходит под проверки внутри `grantAccess`).

Часть учеников может быть выдана, часть — попасть в `errors`.

---

### `DELETE /admin/courses/:courseId/access/:userId`

Отзыв доступа (`revoked_at`). Пользователь должен быть учеником вашей школы.

**Ответ `204`** без тела.

---

### Запрещённые для `school_admin` маршруты курсов

| Метод | Путь | Ответ |
|-------|------|--------|
| POST | `/admin/courses` | 403 |
| PATCH | `/admin/courses/:courseId` | 403 |
| DELETE | `/admin/courses/:courseId` | 403 |

---

## 5. Устройства и уведомления

Те же эндпоинты, что в общей админ-доке, с JWT:

| Метод | Путь |
|-------|------|
| GET | `/admin/device-violations` |
| GET | `/admin/notifications` |
| PATCH | `/admin/notifications/:id/read` |
| PATCH | `/admin/notifications/read-all` |
| GET | `/admin/users/:userId/devices` |
| DELETE | `/admin/users/:userId/devices/:deviceId` |

### `PATCH /admin/notifications/read-all`

Помечает **все** непрочитанные уведомления текущего админа как прочитанные.

**Ответ `200`:** `{ "updated": 12 }` — сколько строк обновлено.

Для `school_admin` бэкенд ограничивает данные **своей школой** в списках нарушений и т.д. (см. `DeviceLimitService` / контроллер устройств).

Заголовок **`x-user-id`** для этих маршрутов **не обязателен**, если используется Bearer.

---

## 6. Что недоступно школьному администратору

- Гео CRUD: `/admin/cities`, `/admin/districts`, `/admin/schools` — **403** (только `super_admin`).
- Школьные админы CRUD: `/admin/school-admins` — **403**.
- Глобальные пользователи/супер-админ: полный `/admin/users` как у супер-админа — **403** на чужие школы; удаление пользователей — **403**.
- Модули/контент/квизы не под префиксом курса: `/admin/modules/...` — **403**.
- Загрузки: `/admin/upload/*` — **403**.
- ИИ: `/admin/ai/*` — **403**.
- Статистика платформы: `/admin/stats/summary` — **403**.
- Сертификаты (глобальный реестр): `/admin/certificates` — **403**.

---

*Версия документа синхронизирована с реализацией guards и сервисов в `admin-api`.*
