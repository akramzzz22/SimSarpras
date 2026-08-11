import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { validationError } from '../../utils/helpers'
import { aktifTahunAjaran, aktifTahunAjaranId } from '../../utils/helpers'

const TA_COLS = `id, nama, to_char(tanggal_mulai, 'YYYY-MM-DD') AS tanggal_mulai, to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai, created_at, updated_at`

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang dapat mengakses fitur ini.' })
  }
  const method = getMethod(event)

  if (method === 'GET') {
    const aktif = await aktifTahunAjaran()
    const rows = await q<Row>(`SELECT ${TA_COLS} FROM tahun_ajaran ORDER BY nama`)
    return rows.map((r) => ({
      ...r,
      is_active: r.id === aktif?.tahun_ajaran_id,
      semester: aktif?.semester ?? 'ganjil'
    }))
  }

  // POST
  const body = await readBody(event).catch(() => ({}))
  const nama = String(body?.nama ?? '').trim()
  if (!nama) throw validationError('Nama wajib diisi.', { nama: ['Nama wajib diisi.'] })
  const dup = await q(`SELECT 1 FROM tahun_ajaran WHERE nama = $1 LIMIT 1`, [nama])
  if (dup.length) throw validationError('Nama tahun ajaran sudah ada.', { nama: ['Nama tahun ajaran sudah ada.'] })

  const res = await run(
    `INSERT INTO tahun_ajaran (nama, tanggal_mulai, tanggal_selesai, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now()) RETURNING id`,
    [nama, body?.tanggal_mulai || null, body?.tanggal_selesai || null]
  )
  return (await q<Row>(`SELECT ${TA_COLS} FROM tahun_ajaran WHERE id = $1`, [res.rows[0].id]))[0]!
})
