import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { paginate, validationError, like, aktifTahunAjaranId, logActivity } from '../../utils/helpers'
import { MURID_COLS, attachSimple, attachUser } from '../../utils/relations'

async function attachRelations(rows: Row[]): Promise<void> {
  await attachSimple(rows, 'kelas_id', 'kelas', 'kelas')
  await attachSimple(rows, 'jurusan_id', 'jurusan', 'jurusan')
  await attachSimple(rows, 'proli_id', 'proli', 'proli')
  await attachUser(rows, 'user_id', 'user')
}

async function one_kelas(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT id, nama FROM kelas WHERE id = $1`, [id]))[0] ?? null
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar murid =====
  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    const aktifId = await aktifTahunAjaranId()
    if (aktifId) { conds.push(`tahun_ajaran_id = $${params.length + 1}`); params.push(aktifId) }
    if (query.kelas_id) { conds.push(`kelas_id = $${params.length + 1}`); params.push(Number(query.kelas_id)) }
    if (query.jurusan_id) { conds.push(`jurusan_id = $${params.length + 1}`); params.push(Number(query.jurusan_id)) }
    if (query.q) {
      conds.push(`(nama LIKE $${params.length + 1} OR nis LIKE $${params.length + 2})`)
      params.push(like(String(query.q)), like(String(query.q)))
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${MURID_COLS} FROM murid ${where} ORDER BY created_at DESC, id DESC`, params, 100)
    await attachRelations(result.data)
    return result
  }

  // ===== POST: tambah murid + akun (admin) =====
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menambah murid.')
  const body = await readBody(event).catch(() => ({}))

  const errors: Record<string, string[]> = {}
  if (!String(body?.nis ?? '').trim()) errors.nis = ['NIS wajib diisi.']
  if (!String(body?.nama ?? '').trim()) errors.nama = ['Nama wajib diisi.']
  if (!body?.kelas_id) errors.kelas_id = ['Kelas wajib dipilih.']
  if (body?.nis) {
    const exists = await q(`SELECT 1 FROM murid WHERE nis = $1 LIMIT 1`, [String(body.nis).trim()])
    if (exists.length) errors.nis = ['NIS sudah terdaftar.']
  }
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const nama = String(body.nama).trim()
  const kelas = await one_kelas(Number(body.kelas_id))
  if (!kelas) throw validationError('Kelas tidak ditemukan.', { kelas_id: ['Kelas tidak ditemukan.'] })

  // Buat akun login (role murid) tanpa email/password (di-generate belakangan).
  const ures = await run(
    `INSERT INTO users (name, email, password, kelas, jurusan_id, tempat_lahir, tanggal_lahir, alamat, no_hp, jenis_kelamin, is_active, failed_login_count, created_at, updated_at)
     VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, $7, $8, true, 0, now(), now()) RETURNING id`,
    [
      nama, kelas.nama,
      body?.jurusan_id ? Number(body.jurusan_id) : null,
      body?.tempat_lahir ?? null,
      body?.tanggal_lahir ?? null,
      body?.alamat ?? null,
      body?.no_hp ?? null,
      body?.jenis_kelamin ?? null
    ]
  )
  const userId = ures.rows[0].id
  await run(
    `INSERT INTO model_has_roles (role_id, model_type, model_id) SELECT id, 'App\\Models\\User', $1 FROM roles WHERE name = 'murid'`,
    [userId]
  )

  const tahunAktifId = await aktifTahunAjaranId()
  const mres = await run(
    `INSERT INTO murid (nis, nama, kelas_id, jurusan_id, proli_id, user_id, tahun_ajaran_id, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_hp, tahun_masuk, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()) RETURNING id`,
    [
      String(body.nis).trim(), nama, Number(body.kelas_id),
      body?.jurusan_id ? Number(body.jurusan_id) : null,
      body?.proli_id ? Number(body.proli_id) : null,
      userId, tahunAktifId,
      body?.tempat_lahir ?? null,
      body?.tanggal_lahir ?? null,
      body?.jenis_kelamin ?? null,
      body?.alamat ?? null,
      body?.no_hp ?? null,
      body?.tahun_masuk ?? null
    ]
  )
  const id = mres.rows[0].id

  await logActivity('create', `Menambah murid "${nama}"`, { type: 'App\\Models\\Murid', id }, user.id)

  const created = (await q<Row>(`SELECT ${MURID_COLS} FROM murid WHERE id = $1`, [id]))[0]!
  await attachRelations([created])
  return created
})
