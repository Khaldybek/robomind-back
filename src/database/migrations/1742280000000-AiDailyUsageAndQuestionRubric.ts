import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiDailyUsageAndQuestionRubric1742280000000 implements MigrationInterface {
  name = 'AiDailyUsageAndQuestionRubric1742280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_daily_usage" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "feature" varchar(32) NOT NULL,
        "usage_date" date NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_daily_usage" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_daily_usage_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_ai_daily_usage_user_feature_date" UNIQUE ("user_id", "feature", "usage_date")
      );
      CREATE INDEX "IDX_ai_daily_usage_user_id" ON "ai_daily_usage" ("user_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "questions"
        ADD COLUMN "reference_answer" text,
        ADD COLUMN "grading_rubric" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "questions" DROP COLUMN IF EXISTS "reference_answer", DROP COLUMN IF EXISTS "grading_rubric";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_daily_usage"`);
  }
}
