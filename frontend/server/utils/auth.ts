import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { q, one, run, type Row } from './db'

/** Kolom users yang ikut diserialisasi (password disembunyikan). */
const USER_COLUMNS = `
  id, name, email, email_verified_at, kelas, jurusan_id, foto, jenis_kelamin,
  is_active, failed_login_count, nip, nuptk, tempat_lahir, tanggal_lahir, alamat,
  no_hp, created_at, updated_at,
  (SELECT nis FROM murid WHERE murid.user_id = users.id LIMIT 1) AS nis
`

export interface AuthUser extends Row {
  id: number
  name: string
  email: string | null
  roles: string[]
}

export function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

export async function rolesForUser(userId: number): Promise<string[]> {
  const rows = await q<{ name: string }>(`
    SELECT r.name FROM roles r
    JOIN model_has_roles m ON m.role_id = r.id
    WHERE m.model_type = 'App\\Models\\User' AND m.model_id = $1
    ORDER BY r.id
  `, [userId])
  return rows.map((r) => r.name)
}

export async function userById(id: number): Promise<AuthUser | null> {
  const u = await one(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])
  if (!u) return null
  return { ...u, roles: await rolesForUser(id) } as AuthUser
}

/** Terbitkan token kompatibel Sanctum: "{tokenId}|{plaintext}". */
export async function issueToken(userId: number): Promise<string> {
  const plain = randomBytes(40).toString('hex')
  const res = await run(`
    INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
    VALUES ('App\\Models\\User', $1, 'api-token', $2, '["*"]', now(), now())
    RETURNING id
  `, [userId, hashToken(plain)])
  return `${res.rows[0].id}|${plain}`
}

/** Ambil user dari header Authorization Bearer (format Sanctum). */
export async function authUserFromRequest(event: any): Promise<AuthUser | null> {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  const [idStr, plain] = token.split('|')
  if (!idStr || !plain) return null
  const tokenId = Number(idStr)
  if (!Number.isInteger(tokenId)) return null

  const row = await one(`SELECT token, expires_at, tokenable_id FROM personal_access_tokens WHERE id = $1`, [tokenId])
  if (!row) return null
  if (row.token !== hashToken(plain)) return null
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null

  return userById(row.tokenable_id)
}

export async function requireAuth(event: any): Promise<AuthUser> {
  const user = await authUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }
  return user
}

export function hasRole(user: AuthUser, roles: string | string[]): boolean {
  const list = Array.isArray(roles) ? roles : [roles]
  return user.roles.some((r) => list.includes(r))
}

export function requireRoles(event: any, user: AuthUser, roles: string | string[], message = 'Anda tidak berhak mengakses fitur ini.'): void {
  if (!hasRole(user, roles)) {
    throw createError({ statusCode: 403, statusMessage: message })
  }
}

/** Verifikasi login: email + password (hash bcrypt). */
export async function verifyLogin(email: string, password: string): Promise<AuthUser | null> {
  const user = await one(`SELECT * FROM users WHERE email = $1`, [email])
  if (!user?.password) return null
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return null
  return userById(user.id)
}
