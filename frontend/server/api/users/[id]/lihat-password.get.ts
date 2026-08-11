import { q, type Row } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { validationError, notFound } from '../../../utils/helpers'
import { authorizeAdmin } from '../../../utils/users-helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)

  const id = Number(getRouterParam(event, 'id'))
  const target = (await q<Row>(`SELECT id, name, email FROM users WHERE id = $1`, [id]))[0] ?? null
  if (!target) throw notFound('User tidak ditemukan.')

  const stored = (await q<Row>(`SELECT password, expires_at FROM akun_passwords WHERE user_id = $1 LIMIT 1`, [id]))[0] ?? null
  if (!stored) {
    throw validationError('Belum ada password tersimpan. Generate atau reset password terlebih dahulu.')
  }
  if (stored.expires_at && new Date(stored.expires_at) < new Date()) {
    await q(`DELETE FROM akun_passwords WHERE user_id = $1`, [id])
    throw validationError('Password sementara sudah kedaluwarsa. Silakan reset password.')
  }

  return {
    user_id: id,
    nama: target.name,
    email: target.email,
    password: stored.password
  }
})
