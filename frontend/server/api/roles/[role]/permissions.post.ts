import { q, run, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound, validationError, logActivity } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengubah permission role.')
  const roleId = Number(getRouterParam(event, 'role'))
  const role = (await q<Row>(`SELECT id, name FROM roles WHERE id = $1`, [roleId]))[0] ?? null
  if (!role) throw notFound('Role tidak ditemukan.')

  const body = await readBody(event).catch(() => ({}))
  const ids = Array.isArray(body?.permission_ids) ? body.permission_ids : []
  if (ids.some((id: unknown) => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
    throw validationError('Permission tidak valid.', { permission_ids: ['Permission tidak valid.'] })
  }
  const cleanIds = [...new Set(ids.map(Number))]

  await run(`DELETE FROM role_has_permissions WHERE role_id = $1`, [roleId])
  for (const pid of cleanIds) {
    await run(`INSERT INTO role_has_permissions (permission_id, role_id) VALUES ($1, $2)`, [pid, roleId])
  }

  await logActivity('permission', `Mengubah permission role "${role.name}"`, null, user.id)

  const rows = await q<{ pid: number }>(`SELECT permission_id AS pid FROM role_has_permissions WHERE role_id = $1 ORDER BY permission_id`, [roleId])
  return rows.map((r) => r.pid)
})
