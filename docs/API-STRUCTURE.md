# Структура HTTP API

Базовый префикс: **`/api/v1`**.

Статика загрузок: **`GET /api/v1/files/*`** (каталог `UPLOAD_DIR`, по умолчанию `uploads`).

---

## Корень

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/` | Проверка (hello) |

---

## Auth (`/auth`)

| Метод | Путь | Auth | Описание |
|--------|------|------|----------|
| POST | `/auth/register` | — | Регистрация ученика; опционально `deviceId` — сразу выдаётся пара токенов как при login |
| POST | `/auth/login` | — | Вход (access + refresh); для `student` нужен `deviceId` |
| POST | `/auth/refresh` | — | Обновление пары токенов |
| POST | `/auth/logout` | — | Отзыв refresh (тело с `refreshToken`) |
| POST | `/auth/logout-all` | Bearer | Отзыв всех refresh-сессий пользователя |
| POST | `/auth/forgot-password` | — | Запрос сброса (ответ всегда `{ ok: true }`) |
| POST | `/auth/reset-password` | — | Сброс по одноразовому токену |

---

## Приложение ученика (`/app/*`)

Гео — **без JWT**. Остальные маршруты: **`Authorization: Bearer`**, роль **`student`**.

### Гео (публично)

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/app/cities` | Список активных городов |
| GET | `/app/cities/:cityId/districts` | Районы города |
| GET | `/app/districts/:districtId/schools` | Школы района |

### Профиль и прогресс

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/app/users/me` | Текущий пользователь + школа |
| PATCH | `/app/users/me` | Обновление профиля (`PatchAppUserDto`) |
| GET | `/app/users/me/progress` | Прогресс по модулям |
| GET | `/app/users/me/dashboard` | Сводка (курсы, счётчики прогресса и сертификатов) |
| GET | `/app/users/me/certificates` | Сертификаты пользователя |

### Курсы и модули

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/app/courses` | Курсы с действующим доступом |
| GET | `/app/courses/:courseId/modules` | Курс (id, title, thumbnailUrl) + модули |
| GET | `/app/modules/:moduleId/content` | Контент модуля |
| GET | `/app/modules/:moduleId/quiz` | Тест (без `isCorrect` у ответов) |
| PATCH | `/app/modules/:moduleId/progress` | Обновление прогресса (`PatchModuleProgressDto`) |
| POST | `/app/modules/:moduleId/homework` | Сдача ДЗ: `multipart` поле `file`, опц. `comment` |
| GET | `/app/modules/:moduleId/homework` | Текущая сдача и оценка (`submission` или `null`) |

### Геймификация

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/app/gamification/me` | XP, уровень (до 20), стрик, бейджи + `icon`, `levelProgressPercent`, `progressHints` |
| GET | `/app/gamification/leaderboard` | Топ по XP (`?schoolId`, `?limit`) |
| GET | `/app/gamification/my-rank` | Место в рейтинге (`?schoolId` опционально) |

### Квизы

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/app/quizzes/:quizId/attempt` | Начать / возобновить попытку |
| POST | `/app/attempts/:attemptId/submit` | Отправить ответы (`SubmitQuizAttemptDto.answers`: `questionId` → uuid / uuid[] / строка) |

---

## ИИ для ученика (`/app/ai`)

**Bearer JWT**, роль **`student`** (как у остальных `/app/*`).

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/app/ai/chat` | Диалог по модулю |
| GET | `/app/ai/recommendations` | Рекомендации (`?courseId` опционально) |
| POST | `/app/ai/grade-text` | Оценка свободного ответа |

---

## Админ-панель (`/admin/*`)

**Супер-админ:** **`Authorization: Bearer`**, роль **`super_admin`** (если в контроллере не указано иное).

**Админ школы:** роль **`school_admin`** — доступ к подмножеству маршрутов (пользователи и курсы своей школы, устройства, **`GET /admin/my-school`**). Подробно: **`docs/API-SCHOOL-ADMIN-BACKEND.md`**.

По умолчанию в таблице ниже — **супер-админ**, если не указано иное.

### Только админ школы (`school_admin`)

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/my-school` | Школа + район + город (по JWT `schoolId`) |
| GET | `/admin/school/stats` | Сводка по школе (ученики, доступы, нарушения, непрочитанные уведомления) |
| GET | `/admin/users/export` | CSV учеников школы |
| POST | `/admin/users/import` | Массовое создание учеников из `.xlsx` (`school_admin`, поле `file`) |
| GET | `/admin/homework-submissions` | Список сдач ДЗ по модулю (`moduleId`, для super_admin — `schoolId`) |
| PATCH | `/admin/homework-submissions/:submissionId` | Оценка ДЗ (`points`, опц. `maxPoints`, `feedback`) |
| GET | `/admin/modules/:moduleId/grade-overview` | Журнал: тест + ДЗ по ученикам школы (`schoolId` для super_admin) |

Дополнительно: **`GET /admin/me`**, **`GET .../quiz-attempts`**, **`POST .../access/bulk`**, **`PATCH /admin/notifications/read-all`** — см. **`docs/API-SCHOOL-ADMIN-BACKEND.md`**.

Остальные маршруты, доступные школьному админу, совпадают по пути с таблицами ниже, но с ограничениями — см. **`docs/API-SCHOOL-ADMIN-BACKEND.md`**.

### Сводка и сертификаты

| Метод | Путь | Роль | Описание |
|--------|------|------|----------|
| GET | `/admin/stats/summary` | super_admin | Агрегированная статистика |
| GET | `/admin/certificates` | super_admin | Список сертификатов (фильтры в query) |
| POST | `/admin/certificates` | super_admin | Создать сертификат |
| GET | `/admin/certificates/:id` | super_admin | Один сертификат |
| DELETE | `/admin/certificates/:id` | super_admin | Удалить |

### Профиль (админы)

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/me` | Текущий пользователь из БД (`super_admin` \| `school_admin`) |

### Пользователи

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/users` | Список |
| GET | `/admin/users/:userId` | Карточка |
| PUT | `/admin/users/:userId` | Обновление |
| PATCH | `/admin/users/:userId/activate` | Активация / деактивация |
| DELETE | `/admin/users/:userId` | Удаление |
| GET | `/admin/users/:userId/progress` | Прогресс |
| GET | `/admin/users/:userId/certificates` | Сертификаты |
| GET | `/admin/users/:userId/quiz-attempts` | Попытки квизов ученика |

### Гео и школы (`/admin/cities`, …)

| Метод | Путь | Описание |
|--------|------|----------|
| GET/POST | `/admin/cities`, `/admin/cities/:id` | Города |
| PATCH/DELETE | `/admin/cities/:id` | |
| GET/POST | `/admin/districts`, `/admin/districts/:id` | Районы |
| PATCH/DELETE | `/admin/districts/:id` | |
| GET/POST | `/admin/schools`, `/admin/schools/:id` | Школы |
| PATCH/DELETE | `/admin/schools/:id` | |
| GET | `/admin/schools/:schoolId/admins` | Админы школы |

### Курсы

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/courses` | Список |
| POST | `/admin/courses` | Создать (JSON или multipart + `thumbnail`) |
| GET | `/admin/courses/:courseId` | Детали |
| PATCH | `/admin/courses/:courseId` | Обновить (JSON или multipart + `thumbnail`) |
| DELETE | `/admin/courses/:courseId` | Удалить |
| GET | `/admin/courses/:courseId/modules` | Модули курса |
| GET | `/admin/courses/:courseId/accesses` | Доступы |
| POST | `/admin/courses/:courseId/access` | Выдать доступ |
| POST | `/admin/courses/:courseId/access/bulk` | Массовая выдача доступа |
| DELETE | `/admin/courses/:courseId/access/:userId` | Отозвать |
| GET | `/admin/courses/:courseId/students` | Ученики курса |

### Модули и контент

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/modules` | Список модулей |
| POST | `/admin/modules` | Создать модуль |
| GET | `/admin/modules/:moduleId` | Модуль |
| PATCH | `/admin/modules/:moduleId` | Обновить |
| DELETE | `/admin/modules/:moduleId` | Удалить |
| GET | `/admin/modules/:moduleId/contents` | Контент |
| POST | `/admin/modules/:moduleId/contents` | Добавить контент |
| POST | `/admin/modules/:moduleId/contents/from-file` | Контент из файла |
| POST | `/admin/modules/:moduleId/content` | (алиас) |
| PATCH | `/admin/modules/:moduleId/contents/:contentId` | Обновить блок |
| DELETE | `/admin/modules/:moduleId/contents/:contentId` | Удалить блок |

### Загрузки

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/admin/upload/image` | Загрузка изображения |
| POST | `/admin/upload/video` | Загрузка видео |
| POST | `/admin/upload/file` | Файл |

### Школьные администраторы

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/school-admins` | Список |
| POST | `/admin/school-admins` | Создать |
| GET | `/admin/school-admins/:id` | Карточка |
| PATCH | `/admin/school-admins/:id` | Обновить |
| DELETE | `/admin/school-admins/:id` | Удалить |

### Тесты (квизы)

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/modules/:moduleId/quiz` | Тест модуля |
| POST | `/admin/modules/:moduleId/quiz/import-generated` | Импорт вопросов из ИИ |
| POST | `/admin/modules/:moduleId/quiz` | Создать тест |
| POST | `/admin/quizzes/:quizId/questions` | Добавить вопрос |
| PATCH | `/admin/quizzes/:quizId` | Обновить тест |
| DELETE | `/admin/quizzes/:quizId` | Удалить тест |
| PATCH | `/admin/questions/:questionId` | Обновить вопрос |
| DELETE | `/admin/questions/:questionId` | Удалить вопрос |
| POST | `/admin/questions/:questionId/answers` | Добавить ответ |
| PATCH | `/admin/answers/:answerId` | Обновить ответ |
| DELETE | `/admin/answers/:answerId` | Удалить ответ |

### ИИ (супер-админ)

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/admin/ai/quiz/generate` | Генерация вопросов по тексту модуля |
| POST | `/admin/ai/summarize` | Краткое содержание |
| POST | `/admin/ai/transcribe` | Транскрибация файла (`multipart`) |

### Устройства и уведомления

Роли: **`super_admin`** | **`school_admin`** (см. контроллер).

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/admin/device-violations` | Нарушения лимита устройств |
| GET | `/admin/notifications` | Уведомления (`?unreadOnly`) |
| PATCH | `/admin/notifications/read-all` | Все прочитаны |
| PATCH | `/admin/notifications/:id/read` | Прочитано |
| GET | `/admin/users/:userId/devices` | Устройства ученика |
| DELETE | `/admin/users/:userId/devices/:deviceId` | Снять устройство |

---

## Подробнее по админке

См. также **`docs/API-SUPER-ADMIN-PANEL.md`** — сценарии, поля тел и ответы.

---

## Коды ответов (кратко)

- **401** — нет или невалидный JWT  
- **403** — роль или доступ (курс/модуль/лимит устройств)  
- **404** — сущность не найдена  
- **409** — конфликт (дубликат, FK)  

Валидация тела: глобальный `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`).
