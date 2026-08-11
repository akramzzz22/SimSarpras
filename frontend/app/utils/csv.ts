// ============================================================
// UTIL CSV — parser & generator ringan (RFC 4180).
// Dipakai fitur Export / Import data di master data.
// ============================================================

/**
 * Parse teks CSV → array baris (array sel).
 * Mendukung: kutip ganda ("…"), koma & baris baru di dalam sel, BOM UTF-8,
 * baris kosong dilewati.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '') // hapus BOM bila ada

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

/**
 * Ubah array baris → teks CSV.
 * Setiap sel dikutip (koma/quote di-escape). Diawali BOM (\uFEFF)
 * agar karakter Indonesia terbaca benar saat dibuka di Excel.
 */
export function toCSV(rows: string[][]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
  return '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
}
