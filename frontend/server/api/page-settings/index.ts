import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    // Publik — dipakai header/layout (logo, aturan, batasan).
    const rows = await q<Row>(
      `SELECT id, page_key, page_name, gambar, aturan, batasan, created_at, updated_at
       FROM page_settings ORDER BY page_name`
    )
    return rows
  }

  // POST (admin)
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const body = await readBody(event).catch(() => ({}))

  const errors: Record<string, string[]> = {}
  const pageKey = String(body?.page_key ?? '').trim()
  const pageName = String(body?.page_name ?? '').trim()
  if (!pageKey) errors.page_key = ['Kunci halaman wajib diisi.']
  if (!pageName) errors.page_name = ['Nama halaman wajib diisi.']
  if (pageKey) {
    const dup = await q(`SELECT 1 FROM page_settings WHERE page_key = $1 LIMIT 1`, [pageKey])
    if (dup.length) errors.page_key = ['Kunci halaman sudah dipakai.']
  }
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const res = await run(
    `INSERT INTO page_settings (page_key, page_name, gambar, aturan, batasan, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,now(),now()) RETURNING id`,
    [pageKey, pageName, body?.gambar ?? null, body?.aturan ?? null, body?.batasan ?? null]
  )
  return (await q<Row>(
    `SELECT id, page_key, page_name, gambar, aturan, batasan, created_at, updated_at FROM page_settings WHERE id = $1`,
    [res.rows[0].id]
  ))[0]!
})
