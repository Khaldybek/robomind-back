# API панели администратора школы (School Admin)

Роль: **`school_admin`**. Видит **только свою школу** (`schoolId` в профиле).

База: **`{ORIGIN}/api/v1`**

**Авторизация:** `Authorization: Bearer <access_token>` (роль `school_admin`, в токене/профиле есть `schoolId`).

**Отладка (опционально):** заголовок **`x-user-id`** — только там, где фронт ещё не перевёл вызов на JWT.

**Полный контракт запросов/ответов:** см. **`API-SCHOOL-ADMIN-BACKEND.md`**.

---

## Область ответственности школьного админа

- Ученики **своей** школы: список, активация, просмотр, выдача/отзыв доступа к курсам.
- Уведомления (лимит устройств и др.) **по своим** ученикам.
- Управление **устройствами** учеников своей школы.
- **Нет** (по продукту): создание городов/районов/школ, создание курсов/модулей, загрузка контента, ИИ-редактор курсов — это **супер-админ** (см. `API-SUPER-ADMIN-PANEL.md`).

*Если позже разрешите школе выдавать доступ к курсам без создания курсов — используются те же эндпоинты доступа, что ниже.*

---

## 1. Вход (общий auth)

### `POST /auth/login`

| Поле | Обязательно |
|------|-------------|
| `email` | да |
| `password` | да |
| `deviceId` | **нет** (только у учеников) |

**Ответ `200`:** как у студента: `user` с `role: "school_admin"`, затем JWT (когда будет).

---

## 2. Пользователи (ученики школы) — целевой контракт

Доступ только к пользователям с **`schoolId` = школе админа**.

### `GET /admin/users`

**Query (план):** `page`, `limit`, `search`, `isActive`

**Ответ `200` (план):**

```json
{
  "items": [
    {
      "id": "uuid",
      "email": "…",
      "firstName": "…",
      "lastName": "…",
      "iin": "••••••••••••",
      "role": "student",
      "isActive": true,
      "schoolId": "uuid",
      "createdAt": "…"
    }
  ],
  "total": 0
}
```

---

### `GET /admin/users/:userId`

**Ответ `200`:** карточка ученика (403 если не ваша школа).

---

### `PUT /admin/users/:userId`

**Тело (план):** `{ "firstName", "lastName", "isActive" }` — без смены школы на чужую.

---

### `PATCH /admin/users/:userId/activate`

**Ответ:** активированный ученик / статус.

---

### `GET /admin/users/:userId/progress`

**Ответ (план):** прогресс по курсам этого ученика.

---

### `GET /admin/users/:userId/certificates`

**Ответ (план):** сертификаты ученика.

---

## 3. Доступ к курсам (свои ученики)

### `GET /admin/courses`

Школьный админ обычно получает **список опубликованных курсов** (только чтение), чтобы выдавать доступ.

**Ответ (план):** массив курсов с `id`, `title`, …

---

### `POST /admin/courses/:courseId/access`

**Тело (план):**

```json
{
  "userId": "uuid",
  "accessType": "permanent | temporary",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

- `expiresAt` обязателен при `temporary`.

**Ответ `201`:** запись доступа.

**403:** если `userId` не ученик вашей школы.

---

### `DELETE /admin/courses/:courseId/access/:userId`

**Ответ:** `204`.

---

### `GET /admin/courses/:courseId/students`

Ученики **вашей школы**, у которых есть доступ к курсу.

---

## 4. Устройства и уведомления (реализовано)

Заголовок: **`x-user-id: <uuid админа>`**

### `GET /admin/device-violations`

Попытки входа с лишнего устройства — **только ученики вашей школы**.

**Ответ `200`:**

```json
[
  {
    "id": "uuid",
    "createdAt": "…",
    "attemptedDeviceId": "…",
    "userAgent": "…",
    "ip": "…",
    "student": {
      "id": "uuid",
      "email": "…",
      "firstName": "…",
      "lastName": "…",
      "schoolId": "uuid"
    }
  }
]
```

---

### `GET /admin/notifications`

| Query | Описание |
|-------|----------|
| `unreadOnly=true` | только непрочитанные |

**Ответ `200`:**

```json
[
  {
    "id": "uuid",
    "recipientUserId": "uuid",
    "type": "device_violation",
    "title": "…",
    "body": "…",
    "metadata": { "violationId": "…", "studentUserId": "…" },
    "readAt": null,
    "createdAt": "…"
  }
]
```

---

### `PATCH /admin/notifications/:id/read`

**Ответ:** `{ "ok": true }`

---

### `GET /admin/users/:userId/devices`

Только ученик **вашей** школы.

**Ответ `200`:**

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "deviceId": "…",
    "userAgent": "…",
    "ip": "…",
    "lastLoginAt": "…",
    "createdAt": "…"
  }
]
```

---

### `DELETE /admin/users/:userId/devices/:deviceId`

Снять устройство (в пути `deviceId` — строка UUID устройства).

**Ответ:** `{ "ok": true }`

---

## 5. Ошибки

| Код | Когда |
|-----|--------|
| `401` | Нет/неверный `x-user-id` или токен |
| `403` | Ученик не из вашей школы, не админ |
| `404` | Уведомление не найдено |

---

*Реализация пользователей и курсов для `school_admin` на бэкенде подключена (скоуп по `schoolId`, см. `API-SCHOOL-ADMIN-BACKEND.md`).*
