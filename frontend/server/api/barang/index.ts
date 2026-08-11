import { randomBytes } from 'node:crypto'
import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { paginate, validationError, logActivity, like, aktifTahunAjaranId } from '../../utils/helpers'
import { BARANG_COLS, attachSimple, attachUser } from '../../utils/relations'

function buildWhere(query: Record<string, any>) {
  const conds: string[] = []
  const params: unknown[] = []
  // Barang adalah aset fisik PERMANEN — tidak difilter tahun ajaran.
  // tahun_ajaran_id hanya info tahun pengadaan/masuk barang.
  if (query.owner_type) { conds.push(`owner_type = $${params.length + 1}`); params.push(String(query.owner_type)) }
  if (query.proli_id) { conds.push(`proli_id = $${params.length + 1}`); params.push(Number(query.proli_id)) }
  if (query.search) {
    conds.push(`(nama LIKE $${params.length + 1} OR kode_qr LIKE $${params.length + 2})`)
    params.push(like(String(query.search)), like(String(query.search)))
  }
  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params }
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar barang =====
  if (method === 'GET') {
    const query = getQuery(event)
    const { where, params } = buildWhere(query)
    const result = await paginate(event, `SELECT ${BARANG_COLS} FROM barang ${where} ORDER BY created_at DESC, id DESC`, params)
    await attachSimple(result.data, 'proli_id', 'proli', 'proli')
    await attachSimple(result.data, 'kategori_id', 'kategori', 'kategori_barang')
    await attachSimple(result.data, 'ruangan_id', 'ruangan', 'ruangan')
    await attachSimple(result.data, 'satuan_id', 'satuan', 'satuan')
    await attachSimple(result.data, 'kondisi_id', 'kondisi', 'kondisi_barang')
    await attachSimple(result.data, 'sumber_dana_id', 'sumberDana', 'sumber_dana')
    await attachSimple(result.data, 'tahun_ajaran_id', 'tahunAjaran', 'tahun_ajaran')
    return result
  }

  // ===== POST: tambah barang (admin) =====
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menambah barang.')

  const body = await readBody(event).catch(() => ({}))
  const nama = String(body?.nama ?? '').trim()
  if (!nama) throw validationError('Nama barang wajib diisi.', { nama: ['Nama barang wajib diisi.'] })

  const ownerType = ['sarpras', 'proli'].includes(body?.owner_type) ? body.owner_type : 'sarpras'
  const tahunAktifId = await aktifTahunAjaranId()

  // Jumlah/stok awal (model stok berbasis jumlah: 1 baris bisa mewakili banyak unit)
  const jumlahRaw = Number(body?.jumlah ?? 1)
  if (!Number.isInteger(jumlahRaw) || jumlahRaw < 1) {
    throw validationError('Jumlah minimal 1.', { jumlah: ['Jumlah minimal 1.'] })
  }
  const jumlah = jumlahRaw

  const res = await run(
    `INSERT INTO barang (nama, deskripsi, kode_qr, owner_type, proli_id, kategori_id, ruangan_id, status, bisa_dipinjam, jumlah, satuan_id, kondisi_id, sumber_dana_id, tahun_ajaran_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'aktif',$8,$9,$10,$11,$12,$13,now(),now()) RETURNING id`,
    [
      nama,
      body?.deskripsi ?? null,
      `BRG-${randomBytes(4).toString('hex').toUpperCase()}`,
      ownerType,
      body?.proli_id ? Number(body.proli_id) : null,
      body?.kategori_id ? Number(body.kategori_id) : null,
      body?.ruangan_id ? Number(body.ruangan_id) : null,
      body?.bisa_dipinjam === false ? false : true,
      jumlah,
      body?.satuan_id ? Number(body.satuan_id) : null,
      body?.kondisi_id ? Number(body.kondisi_id) : null,
      body?.sumber_dana_id ? Number(body.sumber_dana_id) : null,
      tahunAktifId
    ]
  )
  const id = res.rows[0].id
  const created = (await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE id = $1`, [id]))[0]!
  await logActivity('create', `Menambah barang "${created.nama}"`, { type: 'App\\Models\\Barang', id }, user.id)
  await attachSimple([created], 'proli_id', 'proli', 'proli')
  await attachSimple([created], 'kategori_id', 'kategori', 'kategori_barang')
  await attachSimple([created], 'ruangan_id', 'ruangan', 'ruangan')
  await attachSimple([created], 'satuan_id', 'satuan', 'satuan')
  await attachSimple([created], 'kondisi_id', 'kondisi', 'kondisi_barang')
  await attachSimple([created], 'sumber_dana_id', 'sumberDana', 'sumber_dana')
  await attachSimple([created], 'tahun_ajaran_id', 'tahunAjaran', 'tahun_ajaran')
  return created
})
