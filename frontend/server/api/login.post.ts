import { one } from '../utils/db'
import { verifyLogin, issueToken } from '../utils/auth'
import { validationError, logActivity } from '../utils/helpers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')

  if (!email || !password) {
    throw validationError('Email dan password wajib diisi.', {
      email: !email ? ['Email wajib diisi.'] : undefined,
      password: !password ? ['Password wajib diisi.'] : undefined
    })
  }

  // Akun yang dinonaktifkan admin tidak boleh login sama sekali.
  const found = await one<{ id: number; is_active: boolean | null }>(
    `SELECT id, is_active FROM users WHERE email = $1`, [email]
  )
  if (found && found.is_active === false) {
    throw validationError('Akun Anda dinonaktifkan. Hubungi administrator.', {
      email: ['Akun Anda dinonaktifkan. Hubungi administrator.']
    })
  }

  const user = await verifyLogin(email, password)
  if (!user) {
    if (found) {
      await one(`UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = $1`, [found.id])
    }
    throw validationError('Email atau password salah.', {
      email: ['Email atau password salah.']
    })
  }

  if (user.failed_login_count > 0) {
    await one(`UPDATE users SET failed_login_count = 0 WHERE id = $1`, [user.id])
  }

  const token = await issueToken(user.id)
  await logActivity('login', `User "${user.name}" login`, null, user.id)

  return {
    token,
    user,
    role: user.roles[0] ?? null,
    roles: user.roles
  }
})
