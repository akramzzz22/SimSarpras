import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { paginate, validationError, logActivity } from '../../utils/helpers'
import { MUTASI_COLS, attachBarang, attachUser, attachSimple } from '../../utils/relations'

async function attach(rows: Row[]): Promise<void> {
  await attachBarang(rows, 'barang_id', 'barang')
  await attachSimple(rows, 'ruangan_asal_id', 'ruanganAsal', 'ruangan')
  await attachSimple(rows, 'ruangan_tujuan_id', 'ruanganTujuan', 'ruangan')
  await attachUser(rows, 'user_id', 'user')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const method = getMethod(event)

  // ===== GET: daftar mutasi (admin) =====
  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    if (query.jenis) { conds.push(`jenis = $${params.length + 1}`); params.push(String(query.jenis)) }
    if (query.barang_id) { conds.push(`barang_id = $${params.length + 1}`); params.push(Number(query.barang_id)) }
    if (query.tanggal_awal) { conds.push(`tanggal >= $${params.length + 1}::date`); params.push(String(query.tanggal_awal)) }
    if (query.tanggal_akhir) { conds.push(`tanggal <= $${params.length + 1}::date`); params.push(String(query.tanggal_akhir)) }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${MUTASI_COLS} FROM mutasi_barang ${where} ORDER BY created_at DESC, id DESC`, params)
    await attach(result.data)
    return result
  }

  // ===== POST: catat mutasi (admin) =====
  const body = await readBody(event).catch(() => ({}))

  const errors: Record<string, string[]> = {}
  if (!body?.barang_id) errors.barang_id = ['Barang wajib dipilih.']
  if (!['masuk', 'keluar', 'pindah'].includes(body?.jenis)) errors.jenis = ['Jenis mutasi tidak valid.']
  if (!body?.tanggal) errors.tanggal = ['Tanggal wajib diisi.']
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const jenis = String(body.jenis)
  const ruanganTujuan = body?.ruangan_tujuan_id ? Number(body.ruangan_tujuan_id) : null
  if (jenis === 'pindah' && !ruanganTujuan) {
    throw validationError('Ruangan tujuan wajib diisi untuk mutasi pindah.', {
      ruangan_tujuan_id: ['Ruangan tujuan wajib diisi untuk mutasi pindah.']
    })
  }

  const res = await run(
    `INSERT INTO mutasi_barang (barang_id, jenis, tanggal, jumlah, keterangan, ruangan_asal_id, ruangan_tujuan_id, user_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()) RETURNING id`,
    [
      Number(body.barang_id), jenis, String(body.tanggal),
      Number(body?.jumlah ?? 1),
      body?.keterangan ?? null,
      body?.ruangan_asal_id ? Number(body.ruangan_asal_id) : null,
      ruanganTujuan,
      user.id
    ]
  )
  const id = res.rows[0].id

  if (jenis === 'pindah') {
    await run(`UPDATE barang SET ruangan_id = $1, updated_at = now() WHERE id = $2`, [ruanganTujuan, Number(body.barang_id)])
  }

  await logActivity('mutasi', `Mencatat mutasi barang (${jenis})`, { type: 'App\\Models\\MutasiBarang', id }, user.id)

  const created = (await q<Row>(`SELECT ${MUTASI_COLS} FROM mutasi_barang WHERE id = $1`, [id]))[0]!
  await attach([created])
  return created
})
