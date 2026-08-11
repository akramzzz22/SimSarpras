import { randomBytes } from 'node:crypto'
import { q, run, type Row } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { validationError, notFound } from '../../../utils/helpers'
import { attachRolesTo } from '../../../utils/roles-helpers'
import { authorizeAdmin, storePlainPassword, hashPassword } from '../../../utils/users-helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)

  const id = Number(getRouterParam(event, 'id'))
  const target = (await q<Row>(`SELECT id, name, email FROM users WHERE id = $1`, [id]))[0] ?? null
  if (!target) throw notFound('User tidak ditemukan.')
  if (target.email) {
    throw validationError('Akun ini sudah memiliki email & password.')
  }

  const password = randomBytes(5).toString('hex') // 10 karakter
  const email = await buildEmail(target.id, target.name)

  await run(`UPDATE users SET email = $1, password = $2, updated_at = now() WHERE id = $3`, [email, hashPassword(password), id])
  await storePlainPassword(id, password)

  return {
    user_id: id,
    nama: target.name,
    email,
    password,
    generated: true
  }
})

async function buildEmail(userId: number, name: string): Promise<string> {
  const user = (await q<Row>(`SELECT id FROM users WHERE id = $1`, [userId]))[0]!
  const roles = await q<Row>(
    `SELECT r.name FROM roles r JOIN model_has_roles m ON m.role_id = r.id
     WHERE m.model_type = 'App\\Models\\User' AND m.model_id = $1 ORDER BY r.id LIMIT 1`,
    [userId]
  )
  const role = roles[0]?.name ?? 'sekolah'
  const domain = ({
    murid: 'murid.sch.id', guru: 'guru.sch.id', staff_sarpras: 'sarpras.sch.id',
    kaproli: 'kaproli.sch.id', kepsek: 'kepsek.sch.id', admin: 'admin.sch.id'
  } as Record<string, string>)[role] ?? 'sekolah.sch.id'

  let slug = name.toLowerCase().replace(/[^a-z0-9.]+/g, '.').replace(/^\.+|\.+$/g, '')
  slug = slug || `user${userId}`

  let prefix = ''
  if (role === 'murid') {
    const murid = (await q<Row>(`SELECT nis FROM murid WHERE user_id = $1`, [userId]))[0]!
    prefix = murid?.nis ? `${murid.nis}.` : ''
  }

  const base = `${prefix}${slug}`
  let candidate = `${base}@${domain}`
  let i = 1
  while ((await q(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [candidate])).length) {
    candidate = `${base}${i}@${domain}`
    i++
  }
  return candidate
}
