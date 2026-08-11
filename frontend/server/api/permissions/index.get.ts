import { q, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const rows = await q<Row>(`SELECT id, name FROM permissions WHERE guard_name = 'web' ORDER BY name`)
  return rows.map((r) => ({ id: r.id, name: r.name }))
})
