import { q, run, type Row } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { validationError, notFound } from '../../../utils/helpers'
import { USER_COLS, attachSimple, attachMurid } from '../../../utils/relations'
import { attachRolesTo } from '../../../utils/roles-helpers'
import { authorizeAdmin } from '../../../utils/users-helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)

  const id = Number(getRouterParam(event, 'id'))
  if (id === user.id) {
    throw validationError('Tidak dapat menonaktifkan akun sendiri.')
  }

  const target = (await q<Row>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]))[0] ?? null
  if (!target) throw notFound('User tidak ditemukan.')

  const newVal = !target.is_active
  await run(`UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2`, [newVal, id])

  const updated = (await q<Row>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]))[0]!
  await attachRolesTo([updated])
  await attachSimple([updated], 'jurusan_id', 'jurusan', 'jurusan')
  await attachMurid([updated], 'id', 'murid')
  return updated
})
