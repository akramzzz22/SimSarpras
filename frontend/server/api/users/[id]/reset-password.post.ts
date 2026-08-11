import { randomBytes } from 'node:crypto'
import { q, run, type Row } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { validationError, notFound } from '../../../utils/helpers'
import { authorizeAdmin, storePlainPassword, hashPassword } from '../../../utils/users-helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)

  const id = Number(getRouterParam(event, 'id'))
  const target = (await q<Row>(`SELECT id, name, email FROM users WHERE id = $1`, [id]))[0] ?? null
  if (!target) throw notFound('User tidak ditemukan.')
  if (!target.email) {
    throw validationError('Akun belum memiliki email. Buat akun terlebih dahulu.')
  }

  const password = randomBytes(5).toString('hex')
  await run(`UPDATE users SET password = $1, updated_at = now() WHERE id = $2`, [hashPassword(password), id])
  await storePlainPassword(id, password)

  return {
    user_id: id,
    nama: target.name,
    email: target.email,
    password,
    generated: true
  }
})
