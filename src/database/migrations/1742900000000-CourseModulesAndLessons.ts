import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Курс → course_modules (секции) → lessons (бывшие modules).
 * UUID бывших modules сохраняются как id уроков.
 */
export class CourseModulesAndLessons1742900000000 implements MigrationInterface {
  name = 'CourseModulesAndLessons1742900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "title" varchar(512) NOT NULL,
        "description" text,
        "order" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "unlock_after_course_module_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_modules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_modules_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_modules_unlock_after" FOREIGN KEY ("unlock_after_course_module_id") REFERENCES "course_modules"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_course_modules_course_id" ON "course_modules" ("course_id");
    `);

    await queryRunner.query(`
      INSERT INTO "course_modules" ("id", "course_id", "title", "description", "order", "is_published", "created_at", "updated_at")
      SELECT gen_random_uuid(), c.id, 'Основной модуль', NULL, 0, true, now(), now()
      FROM "courses" c;
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" ADD COLUMN "course_module_id" uuid;
    `);

    await queryRunner.query(`
      UPDATE "modules" m
      SET "course_module_id" = (
        SELECT cm.id FROM "course_modules" cm WHERE cm.course_id = m.course_id LIMIT 1
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" ALTER COLUMN "course_module_id" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" ADD CONSTRAINT "FK_modules_course_module"
        FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE;
      CREATE INDEX "IDX_modules_course_module_id" ON "modules" ("course_module_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" DROP CONSTRAINT "FK_modules_unlock_after";
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" DROP CONSTRAINT "FK_modules_course";
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_modules_course_id";`);

    await queryRunner.query(`
      ALTER TABLE "modules" DROP COLUMN "course_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" RENAME COLUMN "unlock_after_module_id" TO "unlock_after_lesson_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" RENAME TO "lessons";
    `);

    await queryRunner.query(`
      ALTER TABLE "lessons" RENAME CONSTRAINT "PK_modules" TO "PK_lessons";
    `);

    await queryRunner.query(`
      ALTER TABLE "lessons" RENAME CONSTRAINT "FK_modules_course_module" TO "FK_lessons_course_module";
    `);

    await queryRunner.query(`
      ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_unlock_after"
        FOREIGN KEY ("unlock_after_lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "module_contents" DROP CONSTRAINT "FK_module_contents_module";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_module_contents_module_id";`);

    await queryRunner.query(`
      ALTER TABLE "module_contents" RENAME COLUMN "module_id" TO "lesson_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "module_contents" RENAME TO "lesson_contents";
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lesson_contents_lesson_id" ON "lesson_contents" ("lesson_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_contents" ADD CONSTRAINT "FK_lesson_contents_lesson"
        FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_contents" RENAME CONSTRAINT "PK_module_contents" TO "PK_lesson_contents";
    `);

    await queryRunner.query(`
      ALTER TABLE "quizzes" DROP CONSTRAINT "FK_quizzes_module";
    `);
    await queryRunner.query(`
      ALTER TABLE "quizzes" DROP CONSTRAINT "UQ_quizzes_module_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "quizzes" RENAME COLUMN "module_id" TO "lesson_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "quizzes" ADD CONSTRAINT "UQ_quizzes_lesson_id" UNIQUE ("lesson_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "quizzes" ADD CONSTRAINT "FK_quizzes_lesson"
        FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_progress" DROP CONSTRAINT "FK_user_progress_module";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_progress" DROP CONSTRAINT "UQ_user_progress_user_module";
    `);

    await queryRunner.query(`
      ALTER TABLE "user_progress" RENAME COLUMN "module_id" TO "lesson_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "user_progress" ADD CONSTRAINT "UQ_user_progress_user_lesson" UNIQUE ("user_id", "lesson_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "user_progress" ADD CONSTRAINT "FK_user_progress_lesson"
        FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "module_homework_submissions" DROP CONSTRAINT "FK_homework_module";
    `);
    await queryRunner.query(`
      ALTER TABLE "module_homework_submissions" DROP CONSTRAINT "UQ_homework_user_module";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_homework_course_module";`);

    await queryRunner.query(`
      ALTER TABLE "module_homework_submissions" RENAME COLUMN "module_id" TO "lesson_id";
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_homework_course_lesson" ON "module_homework_submissions" ("course_id", "lesson_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "module_homework_submissions" RENAME TO "lesson_homework_submissions";
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_homework_submissions" RENAME CONSTRAINT "PK_module_homework_submissions" TO "PK_lesson_homework_submissions";
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_homework_submissions" ADD CONSTRAINT "UQ_homework_user_lesson" UNIQUE ("user_id", "lesson_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "lesson_homework_submissions" ADD CONSTRAINT "FK_homework_lesson"
        FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Откат CourseModulesAndLessons запрещён: миграция меняет схему и данные. ' +
        'Не используйте migration:revert для этого файла — используйте бэкап БД. ' +
        'Если строка уже удалена из таблицы migrations, а схема новая — восстановите запись вручную (см. README/docs по миграциям).',
    );
  }
}
