/**
 * PM2: продакшен Nest (собранный `dist/main.js`).
 * Запуск: npm run build && npm run pm2:start
 * Порт по умолчанию 3012 — переопредели через env или `.env` (PORT=...).
 */
module.exports = {
  apps: [
    {
      name: 'robomind-back',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3012',
      },
    },
  ],
};
