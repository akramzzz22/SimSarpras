import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

const STATUS_VALID = ['available', 'istirahat', 'tidak_tersedia', 'booked']

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar slot =====
  if (method === 'GET') {
    const query = getQuery(event)
    const rows = await q<Row>(
      `SELECT id, barang_id, hari, to_char(jam_mulai, 'HH24:MI') AS jam_mulai,
              to_char(jam_selesai, 'HH24:MI') AS jam_selesai, status, created_at, updated_at
       FROM barang_jadwal ${query.barang_id ? 'WHERE barang_id = $1' : ''}
       ORDER BY hari, jam_mulai`,
      query.barang_id ? [Number(query.barang_id)] : []
    )
    return rows
  }

  // ===== POST: simpan massal (ganti total) =====
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'staff_sarpras'], 'Hanya Admin / Staff Sarpras yang dapat mengatur jadwal booking.')
  const body = await readBody(event).catch(() => ({}))

  if (!body?.barang_id) throw validationError('Barang wajib dipilih.', { barang_id: ['Barang wajib dipilih.'] })
  const slots = Array.isArray(body?.slots) ? body.slots : []

  for (const slot of slots) {
    const mulai = String(slot?.jam_mulai ?? '')
    const selesai = String(slot?.jam_selesai ?? '')
    if (!/^\d{2}:\d{2}$/.test(mulai) || !/^\d{2}:\d{2}$/.test(selesai)) {
      throw validationError('Jam slot tidak valid.')
    }
    if (selesai <= mulai) {
      throw validationError('Jam selesai harus lebih besar dari jam mulai pada tiap slot.')
    }
    const hari = Number(slot?.hari)
    if (!Number.isInteger(hari) || hari < 1 || hari > 7) throw validationError('Hari slot tidak valid.')
  }

  const barangId = Number(body.barang_id)
  await run(`DELETE FROM barang_jadwal WHERE barang_id = $1`, [barangId])

  const seen = new Set<string>()
  const created: Row[] = []
  for (const slot of slots) {
    const key = `${slot.hari}|${slot.jam_mulai}`
    if (seen.has(key)) continue
    seen.add(key)
    const status = STATUS_VALID.includes(slot?.status) ? slot.status : 'available'
    const res = await run(
      `INSERT INTO barang_jadwal (barang_id, hari, jam_mulai, jam_selesai, status, created_at, updated_at)
       VALUES ($1,$2,$3::time,$4::time,$5,now(),now()) RETURNING id`,
      [barangId, Number(slot.hari), String(slot.jam_mulai), String(slot.jam_selesai), status]
    )
    created.push((await q<Row>(
      `SELECT id, barang_id, hari, to_char(jam_mulai, 'HH24:MI') AS jam_mulai, to_char(jam_selesai, 'HH24:MI') AS jam_selesai, status, created_at, updated_at
       FROM barang_jadwal WHERE id = $1`,
      [res.rows[0].id]
    ))[0]!)
  }

  return created
})
