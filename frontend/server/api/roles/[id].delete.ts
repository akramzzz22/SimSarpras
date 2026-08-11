import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus role.')

  const id = Number(getRouterParam(event, 'id'))
  const role = (await q<Row>(`SELECT id, name FROM roles WHERE id = $1`, [id]))[0] ?? null
  if (!role) throw notFound('Role tidak ditemukan.')

  if (role.name === 'admin') {
    throw validationError('Role admin tidak dapat dihapus.')
  }

  await run(`DELETE FROM roles WHERE id = $1`, [id])
  return null
})
