/**
 * Создаёт или обновляет супер-админа. Пароль только в .env (не в git).
 *
 * .env:
 *   SUPER_ADMIN_EMAIL=admin@example.com
 *   SUPER_ADMIN_PASSWORD=надёжный_пароль_от_8_символов
 *
 * npm run seed:super-admin
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { getRawPostgresDataSourceOptions } from '../src/database/postgres-connection';

config({ path: join(__dirname, '../.env') });

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.error(
      'В .env нужны SUPER_ADMIN_EMAIL и SUPER_ADMIN_PASSWORD (мин. 8 символов).',
    );
    process.exit(1);
  }

  const ds = new DataSource({
    ...getRawPostgresDataSourceOptions(),
    synchronize: false,
  });

  await ds.initialize();

  const tables = await ds.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists`,
  );
  if (!tables[0]?.exists) {
    console.error(`
Таблица "users" не найдена — схема БД не создана.

Сделайте по порядку:
  1) Запустите PostgreSQL (например: npm run docker:up)
  2) Примените миграции:  npm run migration:run
  3) Снова:            npm run seed:super-admin
`);
    await ds.destroy();
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await ds.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (existing.length) {
    await ds.query(
      `UPDATE users SET password_hash = $1, role = 'super_admin'::user_role,
       school_id = NULL, is_active = true, updated_at = now() WHERE email = $2`,
      [hash, email],
    );
    console.log('Обновлён супер-админ:', email);
  } else {
    const iin = '999999999999';
    const taken = await ds.query(`SELECT 1 FROM users WHERE iin = $1`, [iin]);
    if (taken.length) {
      console.error(
        'ИИН 999999999999 уже занят. Укажите другой seed-IIN в scripts/seed-super-admin.ts или удалите старую запись.',
      );
      process.exit(1);
    }
    await ds.query(
      `INSERT INTO users (id, iin, first_name, last_name, patronymic, email, password_hash, role, is_active, school_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Super', 'Admin', NULL, $2, $3, 'super_admin'::user_role, true, NULL, now(), now())`,
      [iin, email, hash],
    );
    console.log('Создан супер-админ:', email);
  }

  console.log('Вход: POST /api/v1/auth/login { "email", "password" } (deviceId не нужен)');
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
