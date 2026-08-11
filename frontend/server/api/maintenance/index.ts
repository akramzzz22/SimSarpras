import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { paginate, validationError, aktifTahunAjaranId, logActivity } from '../../utils/helpers'
import { MAINTENANCE_COLS, attachBarang, attachUser, attachSimple } from '../../utils/relations'

async function notifyStaff(staffId: number, maintenanceId: number, barangNama: string, tanggalJadwal: string): Promise<void> {
  try {
    await run(
      `INSERT INTO notifications (id, type, notifiable_type, notifiable_id, data, created_at, updated_at)
       VALUES (gen_random_uuid(), 'App\\Notifications\\MaintenanceScheduled', 'App\\Models\\User', $1, $2, now(), now())`,
      [
        staffId,
        JSON.stringify({
          type: 'maintenance_scheduled',
          maintenance_id: maintenanceId,
          barang: barangNama,
          tanggal_jadwal: tanggalJadwal,
          message: 'Jadwal maintenance baru untuk Anda.'
        })
      ]
    )
  } catch {
    // notifikasi tidak boleh menggagalkan alur
  }
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar maintenance =====
  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    const aktifId = await aktifTahunAjaranId()
    if (aktifId) { conds.push(`tahun_ajaran_id = $${params.length + 1}`); params.push(aktifId) }
    if (query.status) { conds.push(`status = $${params.length + 1}`); params.push(String(query.status)) }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${MAINTENANCE_COLS} FROM maintenance ${where} ORDER BY created_at DESC, id DESC`, params)

    await attachBarang(result.data, 'barang_id', 'barang')
    await attachUser(result.data, 'staff_id', 'staff')
    await attachSimple(result.data, 'vendor_id', 'vendor', 'vendor')
    await attachSimple(result.data, 'jenis_maintenance_id', 'jenisMaintenance', 'jenis_maintenance')
    return result
  }

  // ===== POST: jadwalkan maintenance (admin) =====
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menjadwalkan maintenance.')
  const body = await readBody(event).catch(() => ({}))

  if (!body?.barang_id) throw validationError('Barang wajib dipilih.', { barang_id: ['Barang wajib dipilih.'] })
  if (!body?.tanggal_jadwal) throw validationError('Tanggal jadwal wajib diisi.', { tanggal_jadwal: ['Tanggal jadwal wajib diisi.'] })

  const staffId = body?.staff_id != null ? Number(body.staff_id) : null
  const vendorId = body?.vendor_id != null ? Number(body.vendor_id) : null
  if (staffId && vendorId) throw validationError('Pilih salah satu penanggung jawab: staff ATAU vendor, tidak boleh keduanya.')
  if (!staffId && !vendorId) throw validationError('Pilih salah satu penanggung jawab: staff ATAU vendor.')

  const biaya = Number(body?.biaya ?? 0)
  const resi = body?.resi_url ?? null
  if (biaya > 0 && !resi) {
    throw validationError('Foto resi wajib diunggah jika ada biaya pengeluaran.', {
      resi_url: ['Foto resi wajib diunggah jika ada biaya pengeluaran.']
    })
  }

  const tahunAktifId = await aktifTahunAjaranId()
  const res = await run(
    `INSERT INTO maintenance (barang_id, jenis_maintenance_id, tanggal_jadwal, staff_id, vendor_id, status, catatan, biaya, resi_url, tahun_ajaran_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'terjadwal',$6,$7,$8,$9,now(),now()) RETURNING id`,
    [
      Number(body.barang_id),
      body?.jenis_maintenance_id ? Number(body.jenis_maintenance_id) : null,
      String(body.tanggal_jadwal),
      staffId, vendorId,
      body?.catatan ?? null,
      biaya > 0 ? biaya : null,
      resi,
      tahunAktifId
    ]
  )
  const id = res.rows[0].id

  const barang = (await q<Row>(`SELECT nama FROM barang WHERE id = $1`, [Number(body.barang_id)]))[0]!
  if (staffId) {
    await notifyStaff(staffId, id, barang?.nama ?? `Barang #${Number(body.barang_id)}`, String(body.tanggal_jadwal))
  }
  await logActivity('create', `Menjadwalkan maintenance "${barang?.nama ?? ''}"`, { type: 'App\\Models\\Maintenance', id }, user.id)

  const created = (await q<Row>(`SELECT ${MAINTENANCE_COLS} FROM maintenance WHERE id = $1`, [id]))[0]!
  await attachBarang([created], 'barang_id', 'barang')
  await attachUser([created], 'staff_id', 'staff')
  await attachSimple([created], 'vendor_id', 'vendor', 'vendor')
  await attachSimple([created], 'jenis_maintenance_id', 'jenisMaintenance', 'jenis_maintenance')
  return created
})
