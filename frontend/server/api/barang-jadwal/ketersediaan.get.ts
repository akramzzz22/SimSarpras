import { q, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const query = getQuery(event)
  if (!query.barang_id) throw validationError('Barang wajib dipilih.', { barang_id: ['Barang wajib dipilih.'] })
  if (!query.tanggal) throw validationError('Tanggal wajib diisi.', { tanggal: ['Tanggal wajib diisi.'] })

  const barangId = Number(query.barang_id)
  const tanggal = String(query.tanggal)
  const d = new Date(tanggal + 'T00:00:00')
  const hari = ((d.getDay() + 6) % 7) + 1

  const slots = await q<Row>(
    `SELECT id, barang_id, hari, to_char(jam_mulai, 'HH24:MI') AS jam_mulai,
            to_char(jam_selesai, 'HH24:MI') AS jam_selesai, status
     FROM barang_jadwal WHERE barang_id = $1 AND hari = $2 ORDER BY jam_mulai`,
    [barangId, hari]
  )
  if (!slots.length) return []

  const peminjaman = await q<Row>(
    `SELECT id, to_char(jam_mulai, 'HH24:MI') AS jam_mulai, to_char(jam_selesai, 'HH24:MI') AS jam_selesai
     FROM peminjaman WHERE barang_id = $1 AND tanggal_pinjam = $2 AND status = ANY($3)`,
    [barangId, tanggal, ['menunggu', 'disetujui', 'dipinjam']]
  )

  return slots.map((slot) => {
    const terbooking = peminjaman.some((p) =>
      p.jam_mulai && p.jam_selesai && p.jam_mulai < slot.jam_selesai && p.jam_selesai > slot.jam_mulai
    )
    return {
      id: slot.id,
      barang_id: slot.barang_id,
      hari: slot.hari,
      jam_mulai: slot.jam_mulai,
      jam_selesai: slot.jam_selesai,
      status: terbooking ? 'booked' : slot.status
    }
  })
})
