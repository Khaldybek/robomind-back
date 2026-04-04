import type { CellValue } from 'exceljs';
import { Workbook } from 'exceljs';

/** Максимум строк данных за один запрос (без строки заголовков). */
export const STUDENT_IMPORT_MAX_ROWS = 500;

export type StudentImportField =
  | 'iin'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'patronymic';

export type ParsedStudentRow = {
  /** Номер строки на листе Excel (1-based), для отчёта об ошибках */
  sheetRow: number;
  iin: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string | null;
};

export type ParseStudentImportResult =
  | {
      ok: true;
      rows: ParsedStudentRow[];
    }
  | {
      ok: false;
      message: string;
    };

/**
 * Нормализация заголовка: пробелы, регистр, без различий между "first name" и "firstname".
 */
function headerKey(raw: string): string {
  return raw
    .trim()
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\s/g, '');
}

/** Сопоставление заголовков (RU/EN) → поле. */
const HEADER_TO_FIELD: Record<string, StudentImportField> = {
  iin: 'iin',
  иин: 'iin',
  email: 'email',
  'e-mail': 'email',
  почта: 'email',
  mail: 'email',
  firstname: 'firstName',
  имя: 'firstName',
  lastname: 'lastName',
  фамилия: 'lastName',
  surname: 'lastName',
  patronymic: 'patronymic',
  отчество: 'patronymic',
  middlename: 'patronymic',
  fathername: 'patronymic',
};

function cellToString(value: CellValue | null | undefined): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (Number.isInteger(value) && Math.abs(value) > 1e11) {
      return String(value);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    if (
      'text' in value &&
      typeof (value as { text?: string }).text === 'string'
    ) {
      return (value as { text: string }).text;
    }
    if (
      'richText' in value &&
      Array.isArray((value as { richText: { text: string }[] }).richText)
    ) {
      return (value as { richText: { text: string }[] }).richText
        .map((t) => t.text)
        .join('');
    }
    if (
      'result' in value &&
      (value as { result?: CellValue }).result !== undefined
    ) {
      return cellToString((value as { result: CellValue }).result);
    }
    if (
      'hyperlink' in value &&
      typeof (value as { text?: string }).text === 'string'
    ) {
      return (value as { text: string }).text;
    }
  }
  return String(value);
}

const REQUIRED_FIELDS: StudentImportField[] = [
  'iin',
  'email',
  'firstName',
  'lastName',
];

export async function parseStudentImportXlsx(
  buffer: Buffer,
): Promise<ParseStudentImportResult> {
  if (!buffer?.length) {
    return { ok: false, message: 'Пустой файл' };
  }

  const workbook = new Workbook();
  try {
    // exceljs типизирует load под устаревший Buffer; в рантайме совместимо
    await workbook.xlsx.load(buffer as never);
  } catch {
    return {
      ok: false,
      message: 'Не удалось прочитать файл. Ожидается .xlsx (Excel 2007+).',
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, message: 'В книге нет листов' };
  }

  const headerRow = sheet.getRow(1);
  const colToField = new Map<number, StudentImportField>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellToString(cell.value).trim();
    if (!text) return;
    const key = headerKey(text);
    const field = HEADER_TO_FIELD[key];
    if (field) {
      colToField.set(colNumber, field);
    }
  });

  const seenFields = new Set(colToField.values());
  for (const req of REQUIRED_FIELDS) {
    if (!seenFields.has(req)) {
      const labels: Record<StudentImportField, string> = {
        iin: 'ИИН / iin',
        email: 'email',
        firstName: 'Имя / firstName',
        lastName: 'Фамилия / lastName',
        patronymic: 'Отчество / patronymic',
      };
      return {
        ok: false,
        message: `В первой строке не найдена обязательная колонка «${labels[req]}»`,
      };
    }
  }

  const rows: ParsedStudentRow[] = [];
  const rowCount = sheet.rowCount ?? 0;

  for (let r = 2; r <= rowCount; r++) {
    if (rows.length >= STUDENT_IMPORT_MAX_ROWS) {
      break;
    }
    const excelRow = sheet.getRow(r);
    const cells: Partial<Record<StudentImportField, string>> = {};

    colToField.forEach((field, colNumber) => {
      const raw = cellToString(excelRow.getCell(colNumber).value);
      cells[field] = raw;
    });

    const rawIin = (cells.iin ?? '').trim();
    const rawEmail = (cells.email ?? '').trim();
    const rawFirst = (cells.firstName ?? '').trim();
    const rawLast = (cells.lastName ?? '').trim();
    const rawPat = (cells.patronymic ?? '').trim();

    if (!rawIin && !rawEmail && !rawFirst && !rawLast && !rawPat) {
      continue;
    }

    rows.push({
      sheetRow: r,
      iin: rawIin,
      email: rawEmail,
      firstName: rawFirst,
      lastName: rawLast,
      patronymic: rawPat ? rawPat : null,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      message:
        'Нет строк с данными (проверьте, что данные начинаются со 2-й строки)',
    };
  }

  return { ok: true, rows };
}
