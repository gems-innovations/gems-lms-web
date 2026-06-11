import * as XLSX from 'xlsx';
import { EUserRole } from 'auth';
import { ICreateUserForm } from '../../forms/user-form/user-form';

export interface IXlsxParseResult {
  rows: ICreateUserForm[];
  error: string | null;
}

const EMPTY_FILE_ERROR =
  'El archivo no contiene filas válidas. Verifica que tenga columnas: firstName, lastName, email, username, role';
const READ_ERROR = 'Error al leer el archivo. Asegúrate de que sea un .xlsx válido.';

export function parseUsersXlsx(buffer: ArrayBuffer): IXlsxParseResult {
  try {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

    const rows: ICreateUserForm[] = [];
    for (const row of rawRows) {
      const firstName = row['firstName'] || row['Nombre'] || '';
      const lastName = row['lastName'] || row['Apellido'] || '';
      const email = row['email'] || row['Correo'] || '';
      const username = row['username'] || row['Usuario'] || email.split('@')[0];
      const rawRole = (row['role'] || row['Rol'] || 'student').toLowerCase();
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
