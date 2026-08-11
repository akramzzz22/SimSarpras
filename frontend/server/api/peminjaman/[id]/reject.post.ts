import { q, run, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound, validationError, logActivity } from '../../../utils/helpers'
import { PEMINJAMAN_COLS, attachBarang, attachUser } from '../../../utils/relations'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'kaproli'], 'Hanya Admin / Ketua Proli yang dapat menolak peminjaman.')

  const id = Number(getRouterParam(event, 'id'))
  const peminjaman = (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0] ?? null
  if (!peminjaman) throw notFound('Peminjaman tidak ditemukan.')

  if (peminjaman.status !== 'menunggu') {
    throw validationError('Hanya pengajuan berstatus menunggu yang dapat ditolak.')
  }

  await run(`UPDATE peminjaman SET status = 'ditolak', disetujui_oleh = $1, updated_at = now() WHERE id = $2`, [user.id, id])
  await logActivity('reject', `Menolak peminjaman #${id}`, { type: 'App\\Models\\Peminjaman', id }, user.id)

  const updated = (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0]!
  await attachBarang([updated], 'barang_id', 'barang')
  await attachUser([updated], 'peminjam_id', 'peminjam')
  return updated
})
