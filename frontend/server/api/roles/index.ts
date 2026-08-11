import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const method = getMethod(event)

  if (method === 'GET') {
    const counts = await q<{ role_id: number; total: number }>(
      `SELECT role_id, count(*) AS total FROM model_has_roles GROUP BY role_id`
    )
    const countMap = new Map(counts.map((c) => [c.role_id, Number(c.total)]))
    const roles = await q<Row>(`SELECT id, name, guard_name, created_at, updated_at FROM roles ORDER BY name`)
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      guard_name: r.guard_name,
      users_count: countMap.get(r.id) ?? 0
    }))
  }

  // POST
  const body = await readBody(event).catch(() => ({}))
  const name = String(body?.name ?? '').trim()
  if (!name) throw validationError('Nama role wajib diisi.', { name: ['Nama role wajib diisi.'] })
  const dup = await q(`SELECT 1 FROM roles WHERE name = $1 LIMIT 1`, [name])
  if (dup.length) throw validationError('Role sudah ada.', { name: ['Role sudah ada.'] })

  const res = await run(
    `INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES ($1, 'web', now(), now()) RETURNING id`,
    [name]
  )
  return (await q<Row>(`SELECT id, name, guard_name, created_at, updated_at FROM roles WHERE id = $1`, [res.rows[0].id]))[0]!
})
