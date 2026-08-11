import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')

  const id = Number(getRouterParam(event, 'id'))
  const row = (await q<Row>(`SELECT id FROM page_settings WHERE id = $1`, [id]))[0] ?? null
  if (!row) throw notFound('Pengaturan halaman tidak ditemukan.')
  const method = getMethod(event)

  if (method === 'PUT') {
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.page_name !== undefined) push('page_name', String(body.page_name ?? '').trim() || null)
    if (body?.gambar !== undefined) push('gambar', body.gambar === '' ? null : String(body.gambar))
    if (body?.aturan !== undefined) push('aturan', body.aturan)
    if (body?.batasan !== undefined) push('batasan', body.batasan)

    if (fields.length) {
      params.push(id)
      await run(`UPDATE page_settings SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }
    return (await q<Row>(
      `SELECT id, page_key, page_name, gambar, aturan, batasan, created_at, updated_at FROM page_settings WHERE id = $1`,
      [id]
    ))[0]!
  }

  if (method === 'DELETE') {
    await run(`DELETE FROM page_settings WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
