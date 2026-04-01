# Лимит устройств (ученик)

- На один аккаунт **ученика** — не более **2** зарегистрированных устройств (`MAX_STUDENT_DEVICES`, по умолчанию 2).
- Клиент передаёт стабильный **`deviceId`** (UUID) при каждом входе: тот же ID с того же браузера/приложения.
- **Админы** (`school_admin`, `super_admin`) лимиту не подлежат, `deviceId` не обязателен.

## Поток

1. Успешная проверка email/пароля.
2. Для ученика: если `deviceId` уже есть в `user_devices` — обновляется `last_login_at`, вход разрешён.
3. Если устройство новое и у ученика уже **2** записи — вход **403**, создаётся запись в `device_access_violations`.
4. В `admin_notifications` попадают все **super_admin** и **school_admin** школы этого ученика (если есть `school_id`).

## API

| Метод | Путь |
|-------|------|
| POST | `/api/v1/auth/login` — тело: `email`, `password`, `deviceId` (обязателен для student) |
| GET | `/api/v1/admin/device-violations` — `x-user-id`: админ |
| GET | `/api/v1/admin/notifications?unreadOnly=true` |
| PATCH | `/api/v1/admin/notifications/:id/read` |
| GET | `/api/v1/admin/users/:userId/devices` |
| DELETE | `/api/v1/admin/users/:userId/devices/:deviceId` — снять устройство |

Дальше: JWT вместо `x-user-id`, опционально email/push при новом нарушении.
