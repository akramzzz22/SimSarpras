import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { paginate, validationError, aktifTahunAjaranId, logActivity } from '../../utils/helpers'
import { LAPORAN_COLS, attachBarang, attachUser, attachSimple } from '../../utils/relations'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar laporan =====
  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    const aktifId = await aktifTahunAjaranId()
    if (aktifId) { conds.push(`tahun_ajaran_id = $${params.length + 1}`); params.push(aktifId) }
    if (query.status) { conds.push(`status = $${params.length + 1}`); params.push(String(query.status)) }
    if (query.status_in) { conds.push(`status = ANY($${params.length + 1})`); params.push(String(query.status_in).split(',')) }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${LAPORAN_COLS} FROM laporan_kerusakan ${where} ORDER BY created_at DESC, id DESC`, params)

    await attachBarang(result.data, 'barang_id', 'barang')
    await attachUser(result.data, 'pelapor_id', 'pelapor')
    await attachUser(result.data, 'assigned_to', 'assignedStaff')
    await attachSimple(result.data, 'vendor_id', 'vendor', 'vendor')
    await attachSimple(result.data, 'jenis_kerusakan_id', 'jenisKerusakan', 'jenis_kerusakan')
    await attachSimple(result.data, 'tingkat_kerusakan_id', 'tingkatKerusakan', 'tingkat_kerusakan')
    return result
  }

  // ===== POST: lapor kerusakan =====
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))

  if (!body?.barang_id) throw validationError('Barang wajib dipilih.', { barang_id: ['Barang wajib dipilih.'] })
  if (!body?.deskripsi) throw validationError('Deskripsi wajib diisi.', { deskripsi: ['Deskripsi wajib diisi.'] })

  const barang = (await q<Row>(`SELECT id, nama FROM barang WHERE id = $1`, [Number(body.barang_id)]))[0]!
  if (!barang) throw validationError('Barang tidak ditemukan.', { barang_id: ['Barang tidak ditemukan.'] })

  const tahunAktifId = await aktifTahunAjaranId()
  const res = await run(
    `INSERT INTO laporan_kerusakan (barang_id, pelapor_id, deskripsi, foto_url, status, jenis_kerusakan_id, tingkat_kerusakan_id, tahun_ajaran_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'menunggu',$5,$6,$7,now(),now()) RETURNING id`,
    [
      Number(body.barang_id), user.id, String(body.deskripsi),
      body?.foto_url ?? null,
      body?.jenis_kerusakan_id ? Number(body.jenis_kerusakan_id) : null,
      body?.tingkat_kerusakan_id ? Number(body.tingkat_kerusakan_id) : null,
      tahunAktifId
    ]
  )
  const id = res.rows[0].id
  await run(`UPDATE barang SET status = 'rusak', updated_at = now() WHERE id = $1`, [Number(body.barang_id)])

  await logActivity('laporan', `Laporan kerusakan baru untuk barang "${barang.nama}"`, { type: 'App\\Models\\LaporanKerusakan', id }, user.id)

  const created = (await q<Row>(`SELECT ${LAPORAN_COLS} FROM laporan_kerusakan WHERE id = $1`, [id]))[0]!
  await attachBarang([created], 'barang_id', 'barang')
  return created
})
