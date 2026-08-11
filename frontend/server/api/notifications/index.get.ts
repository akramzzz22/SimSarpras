import { q, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const rows = await q<Row>(
    `SELECT id, data, read_at, created_at FROM notifications
     WHERE notifiable_type = 'App\\Models\\User' AND notifiable_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [user.id]
  )
  const unread = await q(
    `SELECT 1 FROM notifications WHERE notifiable_type = 'App\\Models\\User' AND notifiable_id = $1 AND read_at IS NULL LIMIT 1`,
    [user.id]
  )
  // unread_count = jumlah sebenarnya, bukan sekadar "ada"
  const unreadCount = (await q<{ n: number }>(
    `SELECT count(*) AS n FROM notifications WHERE notifiable_type = 'App\\Models\\User' AND notifiable_id = $1 AND read_at IS NULL`,
    [user.id]
  ))[0]?.n ?? 0

  return {
    data: rows.map((n) => ({
      id: n.id,
      data: (() => { try { return JSON.parse(n.data ?? '{}') } catch { return {} } })(),
      read_at: n.read_at,
      created_at: n.created_at
    })),
    unread_count: unreadCount
  }
})
