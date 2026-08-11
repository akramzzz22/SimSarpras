import { q, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound } from '../../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')

  const roleId = Number(getRouterParam(event, 'role'))
  const role = (await q<Row>(`SELECT id FROM roles WHERE id = $1`, [roleId]))[0] ?? null
  if (!role) throw notFound('Role tidak ditemukan.')

  const rows = await q<{ pid: number }>(`SELECT permission_id AS pid FROM role_has_permissions WHERE role_id = $1 ORDER BY permission_id`, [roleId])
  return rows.map((r) => r.pid)
})
