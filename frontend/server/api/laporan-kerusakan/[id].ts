import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'
import { LAPORAN_COLS, attachBarang, attachUser, attachSimple } from '../../utils/relations'

async function load(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${LAPORAN_COLS} FROM laporan_kerusakan WHERE id = $1`, [id]))[0] ?? null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const laporan = await load(id)
  if (!laporan) throw notFound('Laporan tidak ditemukan.')

  if (method === 'GET') {
    await attachBarang([laporan], 'barang_id', 'barang')
    await attachUser([laporan], 'pelapor_id', 'pelapor')
    await attachUser([laporan], 'assigned_to', 'assignedStaff')
    await attachSimple([laporan], 'vendor_id', 'vendor', 'vendor')
    return laporan
  }

  if (method === 'PUT') {
    requireRoles(event, user, ['admin', 'staff_sarpras'], 'Hanya Admin / Staff Sarpras yang dapat memperbarui laporan.')
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []

    if (body?.hasil_perbaikan_url !== undefined) {
      fields.push(`hasil_perbaikan_url = $${params.length + 1}`)
      params.push(body.hasil_perbaikan_url === '' ? null : String(body.hasil_perbaikan_url))
    }
    if (body?.status !== undefined) {
      if (!['menunggu', 'diverifikasi', 'diperbaiki', 'selesai'].includes(body.status)) {
        throw validationError('Status tidak valid.')
      }
      fields.push(`status = $${params.length + 1}`)
      params.push(String(body.status))
    }
    if (fields.length) {
      params.push(id)
      await run(`UPDATE laporan_kerusakan SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }
    const updated = (await load(id))!
    await attachBarang([updated], 'barang_id', 'barang')
    await attachUser([updated], 'pelapor_id', 'pelapor')
    await attachUser([updated], 'assigned_to', 'assignedStaff')
    await attachSimple([updated], 'vendor_id', 'vendor', 'vendor')
    return updated
  }

  if (method === 'DELETE') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus laporan.')
    await run(`DELETE FROM laporan_kerusakan WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
