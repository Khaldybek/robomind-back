import { MigrationInterface, QueryRunner } from 'typeorm';

export class Gamification1742600000000 implements MigrationInterface {
  name = 'Gamification1742600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "badge_key" AS ENUM (
        'first_module',
        'first_quiz_passed',
        'first_course',
        'quiz_perfect',
        'first_attempt_pass',
        'streak_3',
        'streak_7',
        'streak_30',
        'modules_10',
        'modules_50'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "user_gamification" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "xp" integer NOT NULL DEFAULT 0,
        "level" integer NOT NULL DEFAULT 1,
        "streak_days" integer NOT NULL DEFAULT 0,
        "last_activity_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_gamification" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_gamification_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_gamification_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "user_badges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "badge_key" "badge_key" NOT NULL,
        "earned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_badges" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_badges_user_key" UNIQUE ("user_id", "badge_key"),
        CONSTRAINT "FK_user_badges_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_user_badges_user_id" ON "user_badges" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_gamification"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "badge_key"`);
  }
}
