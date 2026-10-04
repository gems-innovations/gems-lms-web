import { Workbook } from 'exceljs';
import { EUserRole } from 'auth';
import { parseUsersXlsx } from './user-xlsx.parser';

describe('parseUsersXlsx', () => {
  it('reads English and Spanish columns from a real workbook', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Usuarios');
    sheet.addRow(['Nombre', 'Apellido', 'Correo', 'Usuario', 'Rol']);
    sheet.addRow(['Ana', 'Torres', 'ana@example.com', 'atorres', 'instructor']);
    sheet.addRow(['Luis', 'Pérez', 'luis@example.com', '', 'student']);
    const bytes = await workbook.xlsx.writeBuffer();

    const result = await parseUsersXlsx(new Uint8Array(bytes).buffer);

    expect(result.error).toBeNull();
    expect(result.rows).toEqual([
      { firstName: 'Ana', lastName: 'Torres', email: 'ana@example.com', username: 'atorres', role: EUserRole.INSTRUCTOR },
      { firstName: 'Luis', lastName: 'Pérez', email: 'luis@example.com', username: 'luis', role: EUserRole.STUDENT },
    ]);
  });

  it('rejects an invalid workbook', async () => {
    const result = await parseUsersXlsx(new TextEncoder().encode('not an xlsx file').buffer);
    expect(result.rows).toEqual([]);
    expect(result.error).toContain('.xlsx válido');
  });
});
