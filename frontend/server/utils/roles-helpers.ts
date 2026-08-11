import { q, type Row } from './db'

/** Lampirkan relasi roles ke daftar users. */
export async function attachRolesTo(rows: Row[]): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const roles = await q<Row>(
    `SELECT r.id, r.name, r.guard_name, m.model_id AS user_id
     FROM roles r JOIN model_has_roles m ON m.role_id = r.id
     WHERE m.model_type = 'App\\Models\\User' AND m.model_id = ANY($1)
     ORDER BY r.id`,
    [ids]
  )
  const m = new Map<number, Row[]>()
  for (const role of roles) {
    const arr = m.get(role.user_id) ?? []
    arr.push({ id: role.id, name: role.name, guard_name: role.guard_name })
    m.set(role.user_id, arr)
  }
  for (const r of rows) r.roles = m.get(r.id) ?? []
}
