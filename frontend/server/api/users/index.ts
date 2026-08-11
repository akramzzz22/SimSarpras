import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { paginate, validationError, like, logActivity } from '../../utils/helpers'
import { USER_COLS, attachSimple, attachMurid } from '../../utils/relations'
import { attachRolesTo } from '../../utils/roles-helpers'
import { authorizeAdmin, resolveRoles, syncRoles, storePlainPassword, hashPassword } from '../../utils/users-helpers'

const VALID_ROLES = ['admin', 'staff_sarpras', 'kaproli', 'guru', 'murid', 'kepsek']

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)

  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    const qs = String(query.q ?? '').trim()

    if (query.role) {
      conds.push(`id IN (SELECT model_id FROM model_has_roles m JOIN roles r ON r.id = m.role_id WHERE m.model_type = 'App\\Models\\User' AND r.name = $${params.length + 1})`)
      params.push(String(query.role))
    }
    if (query.jurusan_id) { conds.push(`jurusan_id = $${params.length + 1}`); params.push(Number(query.jurusan_id)) }
    if (query.kelas) { conds.push(`kelas = $${params.length + 1}`); params.push(String(query.kelas)) }
    if (qs) {
      conds.push(`(name LIKE $${params.length + 1} OR email LIKE $${params.length + 2} OR kelas LIKE $${params.length + 3})`)
      params.push(like(qs), like(qs), like(qs))
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${USER_COLS} FROM users ${where} ORDER BY created_at DESC, id DESC`, params)
    await attachRolesTo(result.data)
    await attachSimple(result.data, 'jurusan_id', 'jurusan', 'jurusan')
    await attachMurid(result.data, 'id', 'murid')
    return result
  }

  // POST
  const body = await readBody(event).catch(() => ({}))
  const errors: Record<string, string[]> = {}
  if (!String(body?.name ?? '').trim()) errors.name = ['Nama wajib diisi.']
  if (!String(body?.email ?? '').trim()) errors.email = ['Email wajib diisi.']
  if (String(body?.password ?? '').length < 8) errors.password = ['Password minimal 8 karakter.']
  if (body?.email) {
    const dup = await q(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [String(body.email).trim()])
    if (dup.length) errors.email = ['Email sudah terdaftar.']
  }
  const roles = resolveRoles(body)
  if (!roles.length) errors.role = ['Pilih minimal satu role.']
  for (const r of roles) {
    if (!VALID_ROLES.includes(r)) errors.roles = ['Role tidak valid.']
  }
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const res = await run(
    `INSERT INTO users (name, email, password, kelas, jurusan_id, nip, nuptk, tempat_lahir, tanggal_lahir, alamat, no_hp, jenis_kelamin, foto, is_active, failed_login_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,0,now(),now()) RETURNING id`,
    [
      String(body.name).trim(), String(body.email).trim(), hashPassword(String(body.password)),
      body?.kelas ?? null,
      body?.jurusan_id ? Number(body.jurusan_id) : null,
      body?.nip ?? null, body?.nuptk ?? null,
      body?.tempat_lahir ?? null, body?.tanggal_lahir ?? null,
      body?.alamat ?? null, body?.no_hp ?? null,
      body?.jenis_kelamin ?? null, body?.foto ?? null
    ]
  )
  const id = res.rows[0].id
  await syncRoles(id, roles)
  await storePlainPassword(id, String(body.password))

  await logActivity('create', `Menambah user "${String(body.name).trim()}"`, { type: 'App\\Models\\User', id }, user.id)

  const created = (await q<Row>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]))[0]!
  await attachRolesTo([created])
  return created
})
