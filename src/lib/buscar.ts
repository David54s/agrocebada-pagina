/**
 * Encuentra el ID_POLIGONO que el usuario quiso escribir: exacto, sin distinguir mayúsculas,
 * o numéricamente igual ("7" encuentra "007"). Devuelve null si no hay coincidencia.
 */
export function buscarId(ids: Iterable<string>, texto: string): string | null {
  const q = texto.trim()
  if (!q) return null
  const lista = [...ids]
  if (lista.includes(q)) return q
  const qMin = q.toLowerCase()
  const igual = lista.find((id) => id.toLowerCase() === qMin)
  if (igual) return igual
  const qNum = soloNumero(q)
  if (qNum === null) return null
  // Solo si es inequívoco: "1" no debe elegir al azar entre HGO_001 y TLX_001.
  const mismos = lista.filter((id) => soloNumero(id) === qNum)
  return mismos.length === 1 ? mismos[0] : null
}

/** "P007" → 7, "0012" → 12; null si el texto no es (prefijo de letras +) número. */
function soloNumero(s: string): number | null {
  const m = /^[a-z_-]*0*(\d+)$/i.exec(s.trim())
  return m ? Number(m[1]) : null
}
