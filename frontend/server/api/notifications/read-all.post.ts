import { run } from '../../utils/db'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  await run(
    `UPDATE notifications SET read_at = now() WHERE notifiable_type = 'App\\Models\\User' AND notifiable_id = $1 AND read_at IS NULL`,
    [user.id]
  )
  return { message: 'OK' }
})
