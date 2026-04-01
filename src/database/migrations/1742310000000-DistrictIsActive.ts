import { MigrationInterface, QueryRunner } from 'typeorm';

export class DistrictIsActive1742310000000 implements MigrationInterface {
  name = 'DistrictIsActive1742310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "districts"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "districts" DROP COLUMN IF EXISTS "is_active";
    `);
  }
}
