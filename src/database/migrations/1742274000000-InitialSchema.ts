import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1742274000000 implements MigrationInterface {
  name = 'InitialSchema1742274000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('student', 'school_admin', 'super_admin');
      CREATE TYPE "course_level" AS ENUM ('beginner', 'intermediate', 'advanced');
      CREATE TYPE "course_access_type" AS ENUM ('permanent', 'temporary');
      CREATE TYPE "module_content_type" AS ENUM ('video', 'file', 'text', 'livestream', 'link');
      CREATE TYPE "question_type" AS ENUM ('single', 'multiple', 'text');
      CREATE TYPE "progress_status" AS ENUM ('not_started', 'in_progress', 'completed');
    `);

    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "name_kz" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cities" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "districts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "name_kz" varchar(255),
        "city_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_districts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_districts_city" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_districts_city_id" ON "districts" ("city_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "schools" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "number" integer,
        "district_id" uuid NOT NULL,
        "address" varchar(512),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schools" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schools_district" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_schools_district_id" ON "schools" ("district_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "iin" varchar(12) NOT NULL,
        "first_name" varchar(255) NOT NULL,
        "last_name" varchar(255) NOT NULL,
        "patronymic" varchar(255),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" "user_role" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "school_id" uuid,
        "avatar_url" varchar(1024),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_iin" UNIQUE ("iin"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_school" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_users_school_id" ON "users" ("school_id");
      ALTER TABLE "users" ADD CONSTRAINT "CHK_users_role_school" CHECK (
        ("role" = 'super_admin' AND "school_id" IS NULL)
        OR ("role" IN ('school_admin', 'student') AND "school_id" IS NOT NULL)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(512) NOT NULL,
        "description" text,
        "thumbnail_url" varchar(1024),
        "level" "course_level" NOT NULL,
        "age_group" varchar(64),
        "is_published" boolean NOT NULL DEFAULT false,
        "order" integer NOT NULL DEFAULT 0,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_courses_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "title" varchar(512) NOT NULL,
        "description" text,
        "order" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "unlock_after_module_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_modules_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_modules_unlock_after" FOREIGN KEY ("unlock_after_module_id") REFERENCES "modules"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_modules_course_id" ON "modules" ("course_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "module_contents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "module_id" uuid NOT NULL,
        "type" "module_content_type" NOT NULL,
        "title" varchar(512),
        "content" text,
        "file_url" varchar(1024),
        "duration" integer,
        "order" integer NOT NULL DEFAULT 0,
        "livestream_url" varchar(1024),
        "livestream_starts_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_module_contents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_module_contents_module" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_module_contents_module_id" ON "module_contents" ("module_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "quizzes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "module_id" uuid NOT NULL,
        "title" varchar(512) NOT NULL,
        "passing_score" integer NOT NULL,
        "max_attempts" integer NOT NULL DEFAULT 3,
        "time_limit_minutes" integer,
        "shuffle_questions" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_quizzes_module_id" UNIQUE ("module_id"),
        CONSTRAINT "FK_quizzes_module" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quiz_id" uuid NOT NULL,
        "text" text NOT NULL,
        "type" "question_type" NOT NULL,
        "image_url" varchar(1024),
        "order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_questions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_questions_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_questions_quiz_id" ON "questions" ("quiz_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "answers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "text" varchar(2048) NOT NULL,
        "is_correct" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_answers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_answers_question" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_answers_question_id" ON "answers" ("question_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "course_accesses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "granted_by" uuid,
        "access_type" "course_access_type" NOT NULL,
        "expires_at" TIMESTAMPTZ,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_accesses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_accesses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_accesses_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_accesses_granted_by" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX "UQ_course_accesses_active_user_course"
        ON "course_accesses" ("user_id", "course_id")
        WHERE "revoked_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "quiz_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quiz_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "score" integer NOT NULL,
        "max_score" integer NOT NULL,
        "is_passed" boolean NOT NULL,
        "started_at" TIMESTAMPTZ NOT NULL,
        "completed_at" TIMESTAMPTZ,
        "answers" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quiz_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quiz_attempts_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quiz_attempts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_quiz_attempts_user_quiz" ON "quiz_attempts" ("user_id", "quiz_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "user_progress" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "module_id" uuid NOT NULL,
        "status" "progress_status" NOT NULL,
        "completed_at" TIMESTAMPTZ,
        "watched_seconds" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_progress_user_module" UNIQUE ("user_id", "module_id"),
        CONSTRAINT "FK_user_progress_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_progress_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_progress_module" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "issued_at" TIMESTAMPTZ NOT NULL,
        "pdf_url" varchar(1024),
        "unique_code" varchar(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_certificates_unique_code" UNIQUE ("unique_code"),
        CONSTRAINT "FK_certificates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_certificates_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quiz_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_accesses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "answers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quizzes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "module_contents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_role_school"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schools"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "districts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cities"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "progress_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "module_content_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "course_access_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "course_level"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
  }
}
