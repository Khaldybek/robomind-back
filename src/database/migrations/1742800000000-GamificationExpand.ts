import { MigrationInterface, QueryRunner } from 'typeorm';

export class GamificationExpand1742800000000 implements MigrationInterface {
  name = 'GamificationExpand1742800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем новые значения enum badge_key
    const newValues = [
      'quizzes_5',
      'quiz_master',
      'courses_3',
      'homework_first',
      'homework_excellent',
      'homework_5',
    ];
    for (const v of newValues) {
      await queryRunner.query(
        `ALTER TYPE "badge_key" ADD VALUE IF NOT EXISTS '${v}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL не поддерживает удаление значений из enum;
    // для rollback нужно пересоздавать тип — намеренно оставлено пустым.
  }
}
