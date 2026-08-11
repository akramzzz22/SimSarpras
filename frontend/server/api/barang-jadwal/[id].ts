import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'

const STATUS_VALID = ['available', 'istirahat', 'tidak_tersedia', 'booked']

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'staff_sarpras'], 'Hanya Admin / Staff Sarpras yang dapat mengatur jadwal booking.')

  const id = Number(getRouterParam(event, 'id'))
  const slot = (await q<Row>(`SELECT id FROM barang_jadwal WHERE id = $1`, [id]))[0] ?? null
  if (!slot) throw notFound('Slot jadwal tidak ditemukan.')
  const method = getMethod(event)

  if (method === 'PUT') {
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.hari !== undefined) {
      const hari = Number(body.hari)
      if (!Number.isInteger(hari) || hari < 1 || hari > 7) throw validationError('Hari tidak valid.')
      push('hari', hari)
    }
    if (body?.jam_mulai !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(String(body.jam_mulai))) throw validationError('Jam mulai tidak valid.')
      push('jam_mulai', String(body.jam_mulai))
    }
    if (body?.jam_selesai !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(String(body.jam_selesai))) throw validationError('Jam selesai tidak valid.')
      if (body?.jam_mulai !== undefined && String(body.jam_selesai) <= String(body.jam_mulai)) {
        throw validationError('Jam selesai harus setelah jam mulai.')
      }
      push('jam_selesai', String(body.jam_selesai))
    }
    if (body?.status !== undefined) {
      if (!STATUS_VALID.includes(body.status)) throw validationError('Status tidak valid.')
      push('status', String(body.status))
    }

    if (fields.length) {
      params.push(id)
      await run(`UPDATE barang_jadwal SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }

    return (await q<Row>(
      `SELECT id, barang_id, hari, to_char(jam_mulai, 'HH24:MI') AS jam_mulai, to_char(jam_selesai, 'HH24:MI') AS jam_selesai, status, created_at, updated_at
       FROM barang_jadwal WHERE id = $1`,
      [id]
    ))[0]!
  }

  if (method === 'DELETE') {
    await run(`DELETE FROM barang_jadwal WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
