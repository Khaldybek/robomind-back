import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuizAttemptLimits1743000000000 implements MigrationInterface {
  name = 'QuizAttemptLimits1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "course_accesses"
      ADD COLUMN IF NOT EXISTS "max_quiz_attempts" integer NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "default_max_quiz_attempts" integer NULL;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_quiz_max_attempt_overrides" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "quiz_id" uuid NOT NULL,
        "max_attempts" integer NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_quiz_max_attempt_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "FK_uqmao_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_uqmao_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_quiz_max_attempt" UNIQUE ("user_id", "quiz_id"),
        CONSTRAINT "CHK_uqmao_max_attempts" CHECK ("max_attempts" >= 1 AND "max_attempts" <= 99)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_quiz_max_attempt_user" ON "user_quiz_max_attempt_overrides" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_quiz_max_attempt_quiz" ON "user_quiz_max_attempt_overrides" ("quiz_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_quiz_max_attempt_overrides"`);
    await queryRunner.query(`
      ALTER TABLE "courses" DROP COLUMN IF EXISTS "default_max_quiz_attempts";
    `);
    await queryRunner.query(`
      ALTER TABLE "course_accesses" DROP COLUMN IF EXISTS "max_quiz_attempts";
    `);
  }
}
