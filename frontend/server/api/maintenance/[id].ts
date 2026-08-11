import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound, validationError, logActivity } from '../../utils/helpers'
import { MAINTENANCE_COLS, attachBarang, attachUser, attachSimple } from '../../utils/relations'

async function load(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${MAINTENANCE_COLS} FROM maintenance WHERE id = $1`, [id]))[0] ?? null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const maintenance = await load(id)
  if (!maintenance) throw notFound('Maintenance tidak ditemukan.')

  if (method === 'GET') {
    await attachBarang([maintenance], 'barang_id', 'barang')
    await attachUser([maintenance], 'staff_id', 'staff')
    await attachSimple([maintenance], 'vendor_id', 'vendor', 'vendor')
    return maintenance
  }

  if (method === 'PUT') {
    // Admin mengelola jadwal; staff sarpras mencatat progres & dokumentasi.
    requireRoles(event, user, ['admin', 'staff_sarpras'], 'Hanya Admin / Staff Sarpras yang dapat mengubah maintenance.')
    const body = await readBody(event).catch(() => ({}))

    // Validasi penanggung jawab hanya jika field ikut dikirim.
    if (body?.staff_id !== undefined || body?.vendor_id !== undefined) {
      const staffId = body?.staff_id !== undefined ? (body.staff_id == null ? null : Number(body.staff_id)) : maintenance.staff_id
      const vendorId = body?.vendor_id !== undefined ? (body.vendor_id == null ? null : Number(body.vendor_id)) : maintenance.vendor_id
      if (staffId && vendorId) throw validationError('Pilih salah satu penanggung jawab: staff ATAU vendor, tidak boleh keduanya.')
      if (!staffId && !vendorId) throw validationError('Pilih salah satu penanggung jawab: staff ATAU vendor.')
    }

    // Foto resi wajib jika ada biaya pengeluaran.
    const biaya = body?.biaya !== undefined ? Number(body.biaya ?? 0) : Number(maintenance.biaya ?? 0)
    const resi = body?.resi_url !== undefined ? (body.resi_url ?? null) : maintenance.resi_url
    if (biaya > 0 && !resi) {
      throw validationError('Foto resi wajib diunggah jika ada biaya pengeluaran.', {
        resi_url: ['Foto resi wajib diunggah jika ada biaya pengeluaran.']
      })
    }

    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.barang_id !== undefined) push('barang_id', Number(body.barang_id))
    if (body?.jenis_maintenance_id !== undefined) push('jenis_maintenance_id', body.jenis_maintenance_id == null ? null : Number(body.jenis_maintenance_id))
    if (body?.tanggal_jadwal !== undefined) push('tanggal_jadwal', String(body.tanggal_jadwal))
    if (body?.staff_id !== undefined) push('staff_id', body.staff_id == null ? null : Number(body.staff_id))
    if (body?.vendor_id !== undefined) push('vendor_id', body.vendor_id == null ? null : Number(body.vendor_id))
    if (body?.catatan !== undefined) push('catatan', body.catatan)
    if (body?.dokumentasi_url !== undefined) push('dokumentasi_url', body.dokumentasi_url === '' ? null : String(body.dokumentasi_url))
    if (body?.biaya !== undefined) push('biaya', Number(body.biaya ?? 0) > 0 ? Number(body.biaya) : null)
    if (body?.resi_url !== undefined) push('resi_url', body.resi_url === '' ? null : String(body.resi_url))
    if (body?.status !== undefined) {
      if (!['terjadwal', 'berlangsung', 'selesai'].includes(body.status)) throw validationError('Status tidak valid.')
      push('status', String(body.status))
    }

    if (fields.length) {
      params.push(id)
      await run(`UPDATE maintenance SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }

    const updated = (await load(id))!
    await logActivity('update', `Mengubah maintenance #${id}`, { type: 'App\\Models\\Maintenance', id }, user.id)
    await attachBarang([updated], 'barang_id', 'barang')
    await attachUser([updated], 'staff_id', 'staff')
    await attachSimple([updated], 'vendor_id', 'vendor', 'vendor')
    await attachSimple([updated], 'jenis_maintenance_id', 'jenisMaintenance', 'jenis_maintenance')
    return updated
  }

  if (method === 'DELETE') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus maintenance.')
    await run(`DELETE FROM maintenance WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
