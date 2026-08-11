import { run } from '../utils/db'
import { requireAuth } from '../utils/auth'
import { logActivity } from '../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const header = getHeader(event, 'authorization') ?? ''
  const tokenId = Number(header.replace('Bearer ', '').trim().split('|')[0])
  if (Number.isInteger(tokenId) && tokenId > 0) {
    await run(`DELETE FROM personal_access_tokens WHERE id = $1`, [tokenId])
  }

  await logActivity('logout', `User "${user.name}" logout`, null, user.id)

  return { message: 'Berhasil logout.' }
})
