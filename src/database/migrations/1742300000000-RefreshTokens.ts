import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokens1742300000000 implements MigrationInterface {
  name = 'RefreshTokens1742300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "user_agent" varchar(512),
        "ip" varchar(64),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
      CREATE INDEX "IDX_refresh_tokens_expires" ON "refresh_tokens" ("expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
