import { q, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { paginate } from '../../utils/helpers'
import { attachUser } from '../../utils/relations'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const query = getQuery(event)
  const conds: string[] = []
  const params: unknown[] = []

  if (query.action) { conds.push(`action = $${params.length + 1}`); params.push(String(query.action)) }
  if (query.user_id) { conds.push(`user_id = $${params.length + 1}`); params.push(Number(query.user_id)) }
  if (query.tanggal) { conds.push(`created_at::date = $${params.length + 1}::date`); params.push(String(query.tanggal)) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const result = await paginate(
    event,
    `SELECT id, user_id, action, subject_type, subject_id, description, ip_address, created_at FROM activity_logs ${where} ORDER BY created_at DESC, id DESC`,
    params,
    20
  )
  await attachUser(result.data, 'user_id', 'user')
  return result
})
