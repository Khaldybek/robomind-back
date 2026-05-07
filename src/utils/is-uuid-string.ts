/** Стандартный строковый UUID (8-4-4-4-12 hex), без зависимости от пакета `uuid` (ESM на Vercel/CJS). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}
