import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang dapat mengakses fitur ini.' })
  }

  const body = await readBody(event).catch(() => ({}))
  const taId = Number(body?.tahun_ajaran_id)
  const semester = body?.semester === 'genap' ? 'genap' : body?.semester === 'ganjil' ? 'ganjil' : null

  if (!Number.isInteger(taId)) throw validationError('Tahun ajaran wajib dipilih.', { tahun_ajaran_id: ['Tahun ajaran wajib dipilih.'] })
  if (!semester) throw validationError('Semester wajib diisi (ganjil/genap).', { semester: ['Semester wajib diisi (ganjil/genap).'] })
  const exists = await q(`SELECT 1 FROM tahun_ajaran WHERE id = $1 LIMIT 1`, [taId])
  if (!exists.length) throw validationError('Tahun ajaran tidak ditemukan.', { tahun_ajaran_id: ['Tahun ajaran tidak ditemukan.'] })

  const setting = await q(`SELECT 1 FROM page_settings WHERE page_key = 'tahun-ajaran-aktif' LIMIT 1`)
  const payload = JSON.stringify({ tahun_ajaran_id: taId, semester })
  if (setting.length) {
    await run(`UPDATE page_settings SET page_name = 'Tahun Ajaran Aktif', aturan = $1, updated_at = now() WHERE page_key = 'tahun-ajaran-aktif'`, [payload])
  } else {
    await run(`INSERT INTO page_settings (page_key, page_name, aturan, created_at, updated_at) VALUES ('tahun-ajaran-aktif', 'Tahun Ajaran Aktif', $1, now(), now())`, [payload])
  }

  const ta = (await q<Row>(
    `SELECT id, nama, to_char(tanggal_mulai, 'YYYY-MM-DD') AS tanggal_mulai, to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai, created_at, updated_at FROM tahun_ajaran WHERE id = $1`,
    [taId]
  ))[0]!

  return {
    tahun_ajaran: ta,
    semester,
    label: ta ? `${ta.nama} • ${semester.charAt(0).toUpperCase() + semester.slice(1)}` : ''
  }
})
