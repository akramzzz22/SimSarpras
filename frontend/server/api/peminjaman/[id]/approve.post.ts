import { q, run, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound, validationError, logActivity } from '../../../utils/helpers'
import { PEMINJAMAN_COLS, attachBarang, attachUser } from '../../../utils/relations'

const STATUS_AKTIF = ['menunggu', 'disetujui', 'dipinjam']

async function cekBentrok(barangId: number, tanggal: string, jamMulai: string, jamSelesai: string, kecualiId: number): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM peminjaman
     WHERE barang_id = $1 AND tanggal_pinjam = $2 AND status = ANY($3)
       AND jam_mulai < $4::time AND jam_selesai > $5::time AND id <> $6 LIMIT 1`,
    [barangId, tanggal, STATUS_AKTIF, jamSelesai, jamMulai, kecualiId]
  )
  return rows.length > 0
}

async function slotDalamJadwal(barangId: number, tanggal: string, jamMulai: string, jamSelesai: string): Promise<boolean | null> {
  const ada = await q(`SELECT 1 FROM barang_jadwal WHERE barang_id = $1 LIMIT 1`, [barangId])
  if (!ada.length) return null
  const d = new Date(tanggal + 'T00:00:00')
  const hari = ((d.getDay() + 6) % 7) + 1
  const slots = await q(
    `SELECT 1 FROM barang_jadwal WHERE barang_id = $1 AND hari = $2 AND status = 'available'
       AND jam_mulai <= $3::time AND jam_selesai >= $4::time LIMIT 1`,
    [barangId, hari, jamMulai, jamSelesai]
  )
  return slots.length > 0
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'kaproli'], 'Hanya Admin / Ketua Proli yang dapat menyetujui peminjaman.')

  const id = Number(getRouterParam(event, 'id'))
  const peminjaman = (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0] ?? null
  if (!peminjaman) throw notFound('Peminjaman tidak ditemukan.')

  const barang = (await q<Row>(`SELECT id, nama, status, bisa_dipinjam FROM barang WHERE id = $1`, [peminjaman.barang_id]))[0] ?? null
  if (!barang || barang.bisa_dipinjam === false) {
    throw validationError('Barang ini tidak bisa dipinjam.')
  }
  if (barang.status === 'rusak' || barang.status === 'maintenance') {
    const label = barang.status === 'rusak' ? 'rusak' : 'dalam maintenance'
    throw validationError(`Barang sedang ${label} dan tidak dapat dipinjam.`)
  }

  if (await cekBentrok(peminjaman.barang_id, peminjaman.tanggal_pinjam, peminjaman.jam_mulai, peminjaman.jam_selesai, peminjaman.id)) {
    throw validationError('Jadwal bentrok dengan peminjaman lain pada barang yang sama.')
  }
  if ((await slotDalamJadwal(peminjaman.barang_id, peminjaman.tanggal_pinjam, peminjaman.jam_mulai, peminjaman.jam_selesai)) === false) {
    throw validationError('Slot waktu sudah tidak tersedia pada jadwal booking barang tersebut.')
  }

  await run(`UPDATE peminjaman SET status = 'disetujui', disetujui_oleh = $1, updated_at = now() WHERE id = $2`, [user.id, id])
  await run(`UPDATE barang SET status = 'dipinjam', updated_at = now() WHERE id = $1`, [peminjaman.barang_id])

  await logActivity('approve', `Menyetujui peminjaman #${id}`, { type: 'App\\Models\\Peminjaman', id }, user.id)

  const updated = (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0]!
  await attachBarang([updated], 'barang_id', 'barang')
  await attachUser([updated], 'peminjam_id', 'peminjam')
  return updated
})
