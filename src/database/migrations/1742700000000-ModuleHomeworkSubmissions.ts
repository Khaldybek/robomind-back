import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModuleHomeworkSubmissions1742700000000 implements MigrationInterface {
  name = 'ModuleHomeworkSubmissions1742700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "module_homework_submissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "module_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "file_url" varchar(1024) NOT NULL,
        "original_filename" varchar(512) NOT NULL,
        "mime_type" varchar(128),
        "size_bytes" integer,
        "student_comment" text,
        "max_points" integer NOT NULL DEFAULT 100,
        "points" integer,
        "feedback" text,
        "graded_at" TIMESTAMPTZ,
        "graded_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_module_homework_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_homework_user_module" UNIQUE ("user_id", "module_id"),
        CONSTRAINT "FK_homework_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_homework_module" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_homework_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_homework_grader" FOREIGN KEY ("graded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_homework_course_module" ON "module_homework_submissions" ("course_id", "module_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_homework_user" ON "module_homework_submissions" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "module_homework_submissions"`,
    );
  }
}
