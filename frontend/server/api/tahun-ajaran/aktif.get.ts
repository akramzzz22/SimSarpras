import { q, type Row } from '../../utils/db'
import { aktifTahunAjaran } from '../../utils/helpers'

export default defineEventHandler(async () => {
  const aktif = await aktifTahunAjaran()
  if (!aktif) return null

  const ta = (await q<Row>(`SELECT id, nama, to_char(tanggal_mulai, 'YYYY-MM-DD') AS tanggal_mulai, to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai, created_at, updated_at FROM tahun_ajaran WHERE id = $1`, [aktif.tahun_ajaran_id]))[0] ?? null

  return {
    tahun_ajaran: ta,
    semester: aktif.semester,
    label: ta ? `${ta.nama} • ${aktif.semester.charAt(0).toUpperCase() + aktif.semester.slice(1)}` : ''
  }
})
