import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuizKazakhTranslations1743100000000 implements MigrationInterface {
  name = 'QuizKazakhTranslations1743100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quizzes"
      ADD COLUMN IF NOT EXISTS "title_kz" varchar(512) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "text_kz" text NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "reference_answer_kz" text NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "grading_rubric_kz" text NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "answers"
      ADD COLUMN IF NOT EXISTS "text_kz" varchar(2048) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "answers" DROP COLUMN IF EXISTS "text_kz";
    `);
    await queryRunner.query(`
      ALTER TABLE "questions" DROP COLUMN IF EXISTS "grading_rubric_kz";
    `);
    await queryRunner.query(`
      ALTER TABLE "questions" DROP COLUMN IF EXISTS "reference_answer_kz";
    `);
    await queryRunner.query(`
      ALTER TABLE "questions" DROP COLUMN IF EXISTS "text_kz";
    `);
    await queryRunner.query(`
      ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "title_kz";
    `);
  }
}
