import { q, run } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  await run(
    `UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND notifiable_type = 'App\\Models\\User' AND notifiable_id = $2`,
    [id, user.id]
  )
  return { message: 'OK' }
})
