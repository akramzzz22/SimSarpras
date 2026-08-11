import bcrypt from 'bcryptjs'
import { q, run } from './db'
import { requireRoles } from './auth'

/** Hash password dengan bcrypt. */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export async function authorizeAdmin(event: any, user: any): Promise<void> {
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
}

export async function syncRoles(userId: number, roles: string[]): Promise<void> {
  await run(`DELETE FROM model_has_roles WHERE model_type = 'App\\Models\\User' AND model_id = $1`, [userId])
  for (const r of roles) {
    await run(
      `INSERT INTO model_has_roles (role_id, model_type, model_id) SELECT id, 'App\\Models\\User', $1 FROM roles WHERE name = $2`,
      [userId, r]
    )
  }
}

export function resolveRoles(body: any): string[] {
  const rolesRaw = Array.isArray(body?.roles) ? body.roles : []
  let roles = [...rolesRaw].map(String).filter(Boolean)
  if (!roles.length && body?.role) roles = [String(body.role)]
  roles = [...new Set(roles)]
  if (roles.includes('admin')) return ['admin']
  if (roles.includes('murid')) return ['murid']
  return roles
}

export async function storePlainPassword(userId: number, password: string): Promise<void> {
  const exists = await q(`SELECT 1 FROM akun_passwords WHERE user_id = $1 LIMIT 1`, [userId])
  if (exists.length) {
    await run(
      `UPDATE akun_passwords SET password = $2, expires_at = now() + interval '30 days', updated_at = now() WHERE user_id = $1`,
      [userId, password]
    )
  } else {
    await run(
      `INSERT INTO akun_passwords (user_id, password, expires_at, created_at, updated_at)
       VALUES ($1, $2, now() + interval '30 days', now(), now())`,
      [userId, password]
    )
  }
}
