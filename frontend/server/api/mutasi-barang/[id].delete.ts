import { run } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus mutasi barang.')
  const id = Number(getRouterParam(event, 'id'))
  const exists = await run(`DELETE FROM mutasi_barang WHERE id = $1`, [id])
  if (!exists.rowCount) throw notFound('Mutasi tidak ditemukan.')
  return null
})
