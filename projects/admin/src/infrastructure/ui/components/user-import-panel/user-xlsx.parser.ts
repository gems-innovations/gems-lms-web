import { EUserRole } from 'auth';
import { Workbook } from 'exceljs';
import { ICreateUserForm } from '../../forms/user-form/user-form';

export interface IXlsxParseResult {
  rows: ICreateUserForm[];
  error: string | null;
}

const EMPTY_FILE_ERROR =
  'El archivo no contiene filas válidas. Verifica que tenga columnas: firstName, lastName, email, username, role';
const READ_ERROR = 'Error al leer el archivo. Asegúrate de que sea un .xlsx válido.';

export async function parseUsersXlsx(buffer: ArrayBuffer): Promise<IXlsxParseResult> {
  try {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { rows: [], error: EMPTY_FILE_ERROR };

    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => headers.set(cell.text.trim(), column));
    const value = (row: number, ...names: string[]): string => {
      const column = names.map(name => headers.get(name)).find(Boolean);
      return column ? sheet.getRow(row).getCell(column).text.trim() : '';
    };

    const rows: ICreateUserForm[] = [];
    for (let row = 2; row <= sheet.rowCount; row++) {
      const firstName = value(row, 'firstName', 'Nombre');
      const lastName = value(row, 'lastName', 'Apellido');
      const email = value(row, 'email', 'Correo');
      const username = value(row, 'username', 'Usuario') || email.split('@')[0];
      const rawRole = (value(row, 'role', 'Rol') || 'student').toLowerCase();
      const role =
        rawRole === 'admin' ? EUserRole.ADMIN
        : rawRole === 'instructor' ? EUserRole.INSTRUCTOR
        : EUserRole.STUDENT;
      if (!firstName || !email) continue;
      rows.push({ firstName, lastName, email, username, role });
    }

    return rows.length ? { rows, error: null } : { rows: [], error: EMPTY_FILE_ERROR };
  } catch {
    return { rows: [], error: READ_ERROR };
  }
}
