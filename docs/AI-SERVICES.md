# ИИ-сервисы (OpenAI API)

Каждый сценарий — отдельный Nest-сервис в `src/modules/ai/`. Общий клиент: `OpenAiService`. Дневные лимиты по пользователю — таблица `ai_daily_usage` + `AiQuotaService`.

## Сервисы

| Сервис | Назначение | API |
|--------|------------|-----|
| **AiChatService** | Контекстный чат по модулю (текст из `module_contents`) | `POST /api/v1/app/ai/chat` |
| **AiQuizGeneratorService** | Автогенерация вопросов по тексту модуля | `POST /api/v1/admin/ai/quiz/generate` |
| **AiRecommendationsService** | Рекомендации по попыткам тестов и прогрессу | `GET /api/v1/app/ai/recommendations` |
| **AiTextGradingService** | Оценка текстового ответа 0–100 + фидбек | `POST /api/v1/app/ai/grade-text` |
| **AiSummarizeService** | Краткое содержание модуля (3–5 предложений) | `POST /api/v1/admin/ai/summarize` |
| **AiTranscriptionService** | Whisper → текст + WebVTT (ru/kk) | `POST /api/v1/admin/ai/transcribe` |

## Заголовок пользователя (временно)

Для ученика маршруты **`/app/ai/*`** защищены **Bearer JWT** (`@CurrentUser('id')`).

## Админские эндпоинты

Защитить **`JwtAuthGuard` + роли** (`super_admin` / при необходимости `school_admin`).

## БД

- **`questions.reference_answer`**, **`questions.grading_rubric`** — эталон и критерии для текстовых вопросов (редактор админки).
- Сдача теста: для `type = text` бэкенд вызывает `AiTextGradingService` с полями вопроса или отдельным вызовом `grade-text`.

## Переменные окружения

См. `.env.example`: `OPENAI_API_KEY`, модели, лимиты `AI_*_DAILY_LIMIT`, **`AI_STUDENT_REPLY_LANGUAGE`** (`kk` \| `ru`) — язык ответов для ученика, если в запросе не передан `language` (`POST /app/ai/chat`, `POST /app/ai/grade-text`, `GET /app/ai/recommendations`).

## Язык ответов (ru / kk)

Промпты для чата, рекомендаций и оценки текста учитывают возраст **4–7 класс**. Для `kk` модель отвечает и заполняет JSON-поля рекомендаций **на казахском**, простым языком.

## Очередь для Voice

Для больших видео транскод + Whisper лучше вынести в **BullMQ** после загрузки файла; текущий `transcribe` принимает файл синхронно (до ~25 МБ типично для Whisper API).
