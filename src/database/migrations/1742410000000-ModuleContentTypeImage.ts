import { MigrationInterface, QueryRunner } from 'typeorm';

/** ADD VALUE вне транзакции — совместимость со старыми версиями PostgreSQL */
export class ModuleContentTypeImage1742410000000 implements MigrationInterface {
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $do$ BEGIN
  ALTER TYPE "module_content_type" ADD VALUE 'image';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;
`);
  }

  public async down(): Promise<void> {
    // откат enum-значения в PG без пересоздания типа не делаем
  }
}
