import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceLimitAndAdminNotifications1742290000000 implements MigrationInterface {
  name = 'DeviceLimitAndAdminNotifications1742290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "device_id" varchar(64) NOT NULL,
        "user_agent" varchar(512),
        "ip" varchar(64),
        "last_login_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_devices_user_device" UNIQUE ("user_id", "device_id")
      );
      CREATE INDEX "IDX_user_devices_user_id" ON "user_devices" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "device_access_violations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "attempted_device_id" varchar(64) NOT NULL,
        "user_agent" varchar(512),
        "ip" varchar(64),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_access_violations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_violations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_device_violations_user_id" ON "device_access_violations" ("user_id");
      CREATE INDEX "IDX_device_violations_created_at" ON "device_access_violations" ("created_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_user_id" uuid NOT NULL,
        "type" varchar(64) NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "metadata" jsonb,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_notifications_recipient" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_admin_notifications_recipient" ON "admin_notifications" ("recipient_user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_access_violations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`);
  }
}
