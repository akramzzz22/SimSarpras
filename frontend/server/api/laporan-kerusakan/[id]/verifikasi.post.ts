import { q, run, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound, validationError, logActivity } from '../../../utils/helpers'
import { LAPORAN_COLS, attachBarang, attachUser, attachSimple } from '../../../utils/relations'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'kaproli'], 'Hanya Admin / Ketua Proli yang dapat memverifikasi laporan.')

  const id = Number(getRouterParam(event, 'id'))
  const laporan = (await q<Row>(`SELECT ${LAPORAN_COLS} FROM laporan_kerusakan WHERE id = $1`, [id]))[0] ?? null
  if (!laporan) throw notFound('Laporan tidak ditemukan.')

  const body = await readBody(event).catch(() => ({}))
  if (body?.assigned_to !== undefined && body.assigned_to !== null && !Number.isInteger(Number(body.assigned_to))) {
    throw validationError('Staff tidak valid.', { assigned_to: ['Staff tidak valid.'] })
  }
  if (body?.vendor_id !== undefined && body.vendor_id !== null && !Number.isInteger(Number(body.vendor_id))) {
    throw validationError('Vendor tidak valid.', { vendor_id: ['Vendor tidak valid.'] })
  }

  await run(
    `UPDATE laporan_kerusakan SET assigned_to = $1, vendor_id = $2, status = 'diverifikasi', updated_at = now() WHERE id = $3`,
    [
      body?.assigned_to != null ? Number(body.assigned_to) : laporan.assigned_to,
      body?.vendor_id != null ? Number(body.vendor_id) : laporan.vendor_id,
      id
    ]
  )
  await logActivity('verifikasi', `Memverifikasi laporan kerusakan #${id}`, { type: 'App\\Models\\LaporanKerusakan', id }, user.id)

  const updated = (await q<Row>(`SELECT ${LAPORAN_COLS} FROM laporan_kerusakan WHERE id = $1`, [id]))[0]!
  await attachBarang([updated], 'barang_id', 'barang')
  await attachUser([updated], 'pelapor_id', 'pelapor')
  await attachUser([updated], 'assigned_to', 'assignedStaff')
  await attachSimple([updated], 'vendor_id', 'vendor', 'vendor')
  return updated
})
