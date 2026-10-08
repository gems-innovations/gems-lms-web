/**
 * Acceso a localStorage que nunca lanza: en el servidor no existe y en el navegador puede estar
 * bloqueado (modo privado, política del navegador, cuota llena). Sin almacenamiento la app sigue
 * funcionando; solo se pierde la preferencia guardada.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const browserStorage = {
  get(key: string): string | null {
    try { return storage()?.getItem(key) ?? null; } catch { return null; }
  },
  set(key: string, value: string): void {
    try { storage()?.setItem(key, value); } catch { /* sin almacenamiento: dura la sesión */ }
  },
  remove(key: string): void {
    try { storage()?.removeItem(key); } catch { /* sin almacenamiento */ }
  },
};
