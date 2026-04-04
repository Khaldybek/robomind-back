/**
 * Демо-курсы с модулями, контент-блоками и тестами (реалистичные тексты на русском).
 * Видео, файлы и картинки не вшиваются — в блоках указано, что подставить после загрузки в админке.
 *
 * .env: `DATABASE_URL` / `DB_URL` или те же `DB_*`, что и для приложения.
 *
 *   npm run seed:demo-courses
 *
 * Повторный запуск: если курс с таким названием уже есть — выход без изменений.
 * Принудительно пересоздать (удалит курсы с этими названиями и зависимости):
 *
 *   SEED_DEMO_FORCE=true npm run seed:demo-courses
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { getRawPostgresDataSourceOptions } from '../src/database/postgres-connection';

config({ path: join(__dirname, '../.env') });

const DEMO_COURSE_TITLES = [
  'Робототехника: основы (LEGO SPIKE)',
  'Arduino и электроника: практикум',
  'Соревновательная робототехника: FIRST LEGO League',
] as const;

async function main() {
  const ds = new DataSource({
    ...getRawPostgresDataSourceOptions(),
    synchronize: false,
  });

  await ds.initialize();

  const exists = await ds.query(
    `SELECT 1 FROM courses WHERE title = $1 LIMIT 1`,
    [DEMO_COURSE_TITLES[0]],
  );
  if (exists.length && process.env.SEED_DEMO_FORCE !== 'true') {
    console.log(
      'Демо-курсы уже есть (найден курс «' +
        DEMO_COURSE_TITLES[0] +
        '»). Для пересоздания: SEED_DEMO_FORCE=true npm run seed:demo-courses',
    );
    await ds.destroy();
    return;
  }

  if (process.env.SEED_DEMO_FORCE === 'true') {
    await ds.query(`DELETE FROM courses WHERE title = ANY($1::text[])`, [
      [...DEMO_COURSE_TITLES],
    ]);
    console.log('Старые демо-курсы удалены (SEED_DEMO_FORCE).');
  }

  await ds.transaction(async (qm) => {
    // ——— Курс 1 ———
    const c1 = randomUUID();
    await qm.query(
      `INSERT INTO courses (id, title, description, thumbnail_url, level, age_group, is_published, "order", created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, 'beginner'::course_level, $4, true, 0, NULL, now(), now())`,
      [
        c1,
        DEMO_COURSE_TITLES[0],
        `Практический вводный курс для школьников: сборка моделей LEGO Education SPIKE Prime / SPIKE Essential, принципы работы датчиков и моторов, простая логика программ. После прохождения ученик понимает, как «робот видит мир» и реагирует на команды.`,
        '10–14 лет',
      ],
    );

    const c1m1 = randomUUID();
    const c1m2 = randomUUID();
    const c1m3 = randomUUID();
    await qm.query(
      `INSERT INTO modules (id, course_id, title, description, "order", is_published, unlock_after_module_id, created_at, updated_at)
       VALUES
       ($1, $4, 'Модуль 1. Знакомство с платформой', $5, 0, true, NULL, now(), now()),
       ($2, $4, 'Модуль 2. Датчики: цвет, расстояние, гироскоп', $6, 1, true, $1, now(), now()),
       ($3, $4, 'Модуль 3. Моторы, передачи и точное движение', $7, 2, true, $2, now(), now())`,
      [
        c1m1,
        c1m2,
        c1m3,
        c1,
        `Что такое SPIKE Hub, как подключать моторы и датчики, первая программа в среде программирования. Безопасность на занятии.`,
        `Разбор типовых датчиков: ультразвуковой/инфракрасный дальномер, датчик цвета, гироскоп. Практика: реакция на препятствие и линию.`,
        `Реверс, мощность, синхронизация моторов, простейшие механизмы (редуктор). Мини-задание: проехать заданную дистанцию с остановкой.`,
      ],
    );

    await insertContents(qm, c1m1, [
      {
        type: 'text',
        title: 'Введение',
        content: `<p>Робототехника объединяет <strong>механику</strong>, <strong>электронику</strong> и <strong>программирование</strong>. На этом курсе вы собираете модель, подключаете датчики и задаёте поведение программой.</p><p>Перед первым включением проверьте: батарея заряжена, кабели вставлены до щелчка, на столе нет мелких деталей, которые могут попасть в механизм.</p>`,
        order: 0,
      },
      {
        type: 'video',
        title: 'Обзор набора (видео — загрузите сами)',
        content: `<p><em>Здесь будет ваше обучающее видео.</em> Загрузите файл через панель администратора (блок типа «Видео») и укажите путь к файлу в поле файла/URL. Рекомендуемая длительность фрагмента: 5–12 минут.</p>`,
        order: 1,
        fileUrl: null,
        duration: null,
      },
      {
        type: 'text',
        title: 'Схема подключения портов (картинка — добавьте в админке)',
        content: `<p><em>Иллюстрация:</em> подпишите на схеме порты A–E и порты датчиков. В панели администратора добавьте отдельный блок типа «Изображение» или «Файл» и загрузите файл — здесь только текстовая заготовка.</p>`,
        order: 2,
      },
      {
        type: 'text',
        title: 'Что сделать на занятии',
        content: `<ol><li>Собрать базовую платформу по инструкции.</li><li>Подключить один мотор и проверить в тестовом режиме.</li><li>Сохранить проект с понятным именем (класс_фамилия_дата).</li></ol>`,
        order: 3,
      },
    ]);
    await insertQuizWithQuestions(qm, c1m1, 'Тест: модуль 1', [
      qSingle(
        'Что из перечисленного относится к трём столпам робототехники в этом курсе?',
        [
          ['Только рисование', false],
          ['Механика, электроника, программирование', true],
          ['Только спорт', false],
          ['Только химия', false],
        ],
      ),
      qSingle(
        'Перед первым включением робота нужно проверить:',
        [
          ['Только цвет корпуса', false],
          ['Заряд батареи и надёжность подключений', true],
          ['Только название Wi‑Fi', false],
          ['Только возраст ученика', false],
        ],
      ),
      qText(
        'Как назовёте правило хранения проектов на занятии? (одно короткое предложение)',
        'класс фамилия дата',
      ),
    ]);

    await insertContents(qm, c1m2, [
      {
        type: 'text',
        title: 'Датчики в робототехнике',
        content: `<p>Датчик превращает физическую величину в данные для программы: расстояние до объекта, цвет поверхности, угол поворота и т.д. Ошибки измерения неизбежны — в программе закладывают <strong>пороги</strong> и <strong>фильтрацию</strong>.</p>`,
        order: 0,
      },
      {
        type: 'file',
        title: 'Рабочий лист (PDF — загрузите сами)',
        content: `<p><em>Прикрепите PDF с заданиями для печати.</em> Ученики заполняют таблицу измерений ультразвукового датчика.</p>`,
        order: 1,
        fileUrl: null,
      },
      {
        type: 'link',
        title: 'Справка LEGO Education',
        content: `https://education.lego.com/`,
        order: 2,
      },
    ]);
    await insertQuizWithQuestions(qm, c1m2, 'Тест: датчики', [
      qSingle(
        'Гироскоп обычно используют, чтобы:',
        [
          ['Измерять температуру воздуха', false],
          ['Оценивать ориентацию и поворот', true],
          ['Взвешивать робота', false],
          ['Заряжать батарею', false],
        ],
      ),
      qSingle(
        'Датчик цвета чаще всего применяют для:',
        [
          ['Следования по линии и распознавания маркеров', true],
          ['Измерения массы', false],
          ['Подключения Wi‑Fi', false],
          ['Охлаждения моторов', false],
        ],
      ),
    ]);

    await insertContents(qm, c1m3, [
      {
        type: 'text',
        title: 'Моторы и передачи',
        content: `<p>Момент и скорость связаны через редуктор: больше передаточное число — больше сила, меньше скорость. Для гонок по прямой и для точного поворота нужны разные настройки мощности и синхронизации портов.</p>`,
        order: 0,
      },
      {
        type: 'video',
        title: 'Демонстрация редуктора (видео — загрузите сами)',
        content: `<p><em>Вставьте короткое видео с кручением шестерён.</em></p>`,
        order: 1,
        fileUrl: null,
      },
    ]);
    await insertQuizWithQuestions(qm, c1m3, 'Тест: моторы', [
      qSingle(
        'Увеличение передаточного числа в редукторе обычно:',
        [
          ['Повышает скорость и снижает силу', false],
          ['Повышает силу и снижает скорость', true],
        ],
      ),
      qSingle(
        'Синхронизация двух моторов на повороте нужна, чтобы:',
        [
          ['Робот ехал ровно без дуги', true],
          ['Увеличить яркость экрана', false],
        ],
      ),
    ]);

    // ——— Курс 2 ———
    const c2 = randomUUID();
    await qm.query(
      `INSERT INTO courses (id, title, description, thumbnail_url, level, age_group, is_published, "order", created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, 'intermediate'::course_level, $4, true, 1, NULL, now(), now())`,
      [
        c2,
        DEMO_COURSE_TITLES[1],
        `Плата Arduino, макетная плата, базовые компоненты (резисторы, светодиоды, кнопки), снятие показаний с аналоговых пинов, широтно-импульсная модуляция. Подходит после знакомства с логикой и простым конструктором.`,
        '12–17 лет',
      ],
    );

    const c2m1 = randomUUID();
    const c2m2 = randomUUID();
    const c2m3 = randomUUID();
    await qm.query(
      `INSERT INTO modules (id, course_id, title, description, "order", is_published, unlock_after_module_id, created_at, updated_at)
       VALUES
       ($1, $4, 'Модуль 1. Питание, GND и первая схема', $5, 0, true, NULL, now(), now()),
       ($2, $4, 'Модуль 2. Аналоговые входы и ШИМ', $6, 1, true, $1, now(), now()),
       ($3, $4, 'Модуль 3. Сервопривод и простой манипулятор', $7, 2, true, $2, now(), now())`,
      [
        c2m1,
        c2m2,
        c2m3,
        c2,
        `Напряжение 5 В и 3,3 В, общая земля, ограничительный резистор для светодиода, первая прошивка из примеров IDE.`,
        `Потенциометр, analogRead, map(), плавное управление яркостью светодиода через analogWrite (ШИМ).`,
        `Импульс управления сервой, угол 0–180°, сборка простейшего захвата. Обсуждение нагрузки на питание.`,
      ],
    );

    await insertContents(qm, c2m1, [
      {
        type: 'text',
        title: 'Безопасность',
        content: `<p>Не замыкайте <strong>5V</strong> на <strong>GND</strong> без нагрузки. Проверяйте полярность светодиода. Долго не держите пальцы на выводах при включённом USB, если схема греется — отключите питание.</p>`,
        order: 0,
      },
      {
        type: 'text',
        title: 'Фото макетной сборки (загрузите в блок «Файл» / «Изображение»)',
        content: `<p><em>Добавьте фото правильной разводки первой схемы через загрузку в админке.</em> Этот блок — текстовая подсказка для преподавателя.</p>`,
        order: 1,
      },
    ]);
    await insertQuizWithQuestions(qm, c2m1, 'Тест: Arduino основы', [
      qSingle(
        'Для ограничения тока через светодиод последовательно ставят:',
        [
          ['Конденсатор', false],
          ['Резистор', true],
          ['Катушку индуктивности', false],
        ],
      ),
      qSingle(
        'Общий провод схемы на Arduino обозначают как:',
        [
          ['GND', true],
          ['VIN', false],
          ['SDA', false],
        ],
      ),
    ]);

    await insertContents(qm, c2m2, [
      {
        type: 'text',
        title: 'АЦП и «шум»',
        content: `<p>Значение analogRead() «плавает» из‑за наводок. В робототехнике часто берут несколько измерений и усредняют или вводят гистерезис для принятия решений.</p>`,
        order: 0,
      },
    ]);
    await insertQuizWithQuestions(qm, c2m2, 'Тест: аналог и ШИМ', [
      qSingle(
        'Функция map() в типичном скетче используется чтобы:',
        [
          ['Перевести диапазон значений в другой диапазон', true],
          ['Удалить прошивку', false],
        ],
      ),
    ]);

    await insertContents(qm, c2m3, [
      {
        type: 'text',
        title: 'Сервопривод',
        content: `<p>Серво ожидает периодический сигнал с длительностью импульса, соответствующей углу. Не перегружайте серву по току — при необходимости используйте отдельное питание с общей землёй с Arduino.</p>`,
        order: 0,
      },
      {
        type: 'file',
        title: 'Схема подключения серво (PDF — загрузите сами)',
        content: `<p><em>Приложите PDF со схемой и списком деталей.</em></p>`,
        order: 1,
        fileUrl: null,
      },
    ]);
    await insertQuizWithQuestions(qm, c2m3, 'Тест: сервопривод', [
      qSingle(
        'Перегрузка по току на линии 5V Arduino может привести к:',
        [
          ['Сбросу платы или нестабильному питанию', true],
          ['Увеличению тактовой частоты', false],
        ],
      ),
    ]);

    // ——— Курс 3 ———
    const c3 = randomUUID();
    await qm.query(
      `INSERT INTO courses (id, title, description, thumbnail_url, level, age_group, is_published, "order", created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, 'advanced'::course_level, $4, true, 2, NULL, now(), now())`,
      [
        c3,
        DEMO_COURSE_TITLES[2],
        `Командная работа, инженерная книга (Engineering Notebook), стратегия матчей, правила сезона, итерации прототипа. Ориентир — формат соревнований FIRST LEGO League: исследование, инновация, автоном и управляемый период.`,
        '12–16 лет',
      ],
    );

    const c3m1 = randomUUID();
    const c3m2 = randomUUID();
    const c3m3 = randomUUID();
    await qm.query(
      `INSERT INTO modules (id, course_id, title, description, "order", is_published, unlock_after_module_id, created_at, updated_at)
       VALUES
       ($1, $4, 'Модуль 1. Роли в команде и регламент', $5, 0, true, NULL, now(), now()),
       ($2, $4, 'Модуль 2. Инженерная книга: гипотезы и тесты', $6, 1, true, $1, now(), now()),
       ($3, $4, 'Модуль 3. Стратегия матча и итерации робота', $7, 2, true, $2, now(), now())`,
      [
        c3m1,
        c3m2,
        c3m3,
        c3,
        `Тренер, капитан, программисты, конструкторы, презентация проекта. Обзор документов сезона и этики соревнований.`,
        `Как фиксировать идеи, эксперименты, неудачи и выводы. Связь с критериями судейства инновационного проекта.`,
        `Разбор поля сезона, приоритетов миссий, надёжности автонома vs телеуправления, план тренировок.`,
      ],
    );

    await insertContents(qm, c3m1, [
      {
        type: 'text',
        title: 'Командные роли',
        content: `<p>Устойчивая команда распределяет задачи так, чтобы не было одного «узкого горлышка». Рекомендуется вести календарь дедлайнов и чек-лист готовности к региональному этапу.</p>`,
        order: 0,
      },
      {
        type: 'link',
        title: 'FIRST® общая информация',
        content: `https://www.firstinspires.org/`,
        order: 1,
      },
    ]);
    await insertQuizWithQuestions(qm, c3m1, 'Тест: регламент и команда', [
      qSingle(
        'Инженерная книга в FLL обычно используется для:',
        [
          ['Фиксации процесса проектирования и исследования', true],
          ['Замены правил сезона', false],
        ],
      ),
    ]);

    await insertContents(qm, c3m2, [
      {
        type: 'text',
        title: 'Гипотеза → эксперимент → вывод',
        content: `<p>Записывайте измеримую гипотезу («если…, то…»), параметры теста и результат — даже отрицательный результат ценен: он отсекает неверный путь.</p>`,
        order: 0,
      },
    ]);
    await insertQuizWithQuestions(qm, c3m2, 'Тест: инженерная книга', [
      qSingle(
        'Повторяемость эксперимента повышается, если:',
        [
          ['Фиксировать условия и не менять несколько переменных сразу', true],
          ['Менять всё одновременно для скорости', false],
        ],
      ),
      qText('Назовите один измеримый критерий успеха для прототипа захвата.', 'время удержания груз успех'),
    ]);

    await insertContents(qm, c3m3, [
      {
        type: 'text',
        title: 'Надёжность на столе',
        content: `<p>На соревнованиях робот падает, кабель отходит, колёса проскальзывают. Планируйте запас по времени автонома и простые процедуры «быстрого восстановления» между матчами.</p>`,
        order: 0,
      },
      {
        type: 'video',
        title: 'Разбор поля сезона (видео — загрузите сами)',
        content: `<p><em>Запишите скринкаст или загрузите нарезку с объяснением миссий.</em></p>`,
        order: 1,
        fileUrl: null,
      },
    ]);
    await insertQuizWithQuestions(qm, c3m3, 'Тест: стратегия', [
      qSingle(
        'При ограниченном времени матча обычно выбирают миссии, которые:',
        [
          ['Дают максимум очков с учётом риска и времени', true],
          ['Всегда самые сложные независимо от риска', false],
        ],
      ),
    ]);
  });

  console.log('Готово. Созданы 3 курса × по 3 модуля: контент + тесты.');
  console.log('Обложки и медиа: загрузите через админку (POST/PATCH курса, блоки модулей).');
  await ds.destroy();
}

type Qm = { query: (sql: string, params?: unknown[]) => Promise<unknown> };

type ContentRow = {
  type: string;
  title: string | null;
  content: string | null;
  order: number;
  fileUrl?: string | null;
  duration?: number | null;
};

async function insertContents(qm: Qm, moduleId: string, rows: ContentRow[]) {
  for (const r of rows) {
    await qm.query(
      `INSERT INTO module_contents (id, module_id, type, title, content, file_url, duration, "order", livestream_url, livestream_starts_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2::module_content_type, $3, $4, $5, $6, $7, NULL, NULL, now(), now())`,
      [
        moduleId,
        r.type,
        r.title,
        r.content,
        r.fileUrl ?? null,
        r.duration ?? null,
        r.order,
      ],
    );
  }
}

type AnswerRow = [string, boolean];

type QuestionPack =
  | { kind: 'single'; text: string; answers: AnswerRow[] }
  | { kind: 'text'; text: string; reference: string };

function qSingle(text: string, answers: AnswerRow[]): QuestionPack {
  return { kind: 'single', text, answers };
}

function qText(text: string, reference: string): QuestionPack {
  return { kind: 'text', text, reference };
}

async function insertQuizWithQuestions(
  qm: Qm,
  moduleId: string,
  quizTitle: string,
  questions: QuestionPack[],
) {
  const quizId = randomUUID();
  await qm.query(
    `INSERT INTO quizzes (id, module_id, title, passing_score, max_attempts, time_limit_minutes, shuffle_questions, created_at, updated_at)
     VALUES ($1, $2, $3, 70, 3, 25, false, now(), now())`,
    [quizId, moduleId, quizTitle],
  );

  let ord = 0;
  for (const q of questions) {
    const qid = randomUUID();
    if (q.kind === 'single') {
      await qm.query(
        `INSERT INTO questions (id, quiz_id, text, type, image_url, "order", reference_answer, grading_rubric, created_at, updated_at)
         VALUES ($1, $2, $3, 'single'::question_type, NULL, $4, NULL, NULL, now(), now())`,
        [qid, quizId, q.text, ord],
      );
      for (const [text, isCorrect] of q.answers) {
        await qm.query(
          `INSERT INTO answers (id, question_id, text, is_correct, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, now(), now())`,
          [qid, text, isCorrect],
        );
      }
    } else {
      await qm.query(
        `INSERT INTO questions (id, quiz_id, text, type, image_url, "order", reference_answer, grading_rubric, created_at, updated_at)
         VALUES ($1, $2, $3, 'text'::question_type, NULL, $4, $5, NULL, now(), now())`,
        [qid, quizId, q.text, ord, q.reference],
      );
    }
    ord += 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
