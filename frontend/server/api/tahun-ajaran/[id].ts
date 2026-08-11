import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'
import { aktifTahunAjaranId } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang dapat mengakses fitur ini.' })
  }

  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)
  const row = (await q<Row>(`SELECT id FROM tahun_ajaran WHERE id = $1`, [id]))[0] ?? null
  if (!row) throw notFound('Tahun ajaran tidak ditemukan.')

  if (method === 'PUT') {
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.nama !== undefined) {
      const nama = String(body.nama ?? '').trim()
      if (!nama) throw validationError('Nama wajib diisi.', { nama: ['Nama wajib diisi.'] })
      const dup = await q(`SELECT 1 FROM tahun_ajaran WHERE nama = $1 AND id <> $2 LIMIT 1`, [nama, id])
      if (dup.length) throw validationError('Nama tahun ajaran sudah ada.', { nama: ['Nama tahun ajaran sudah ada.'] })
      push('nama', nama)
    }
    if (body?.tanggal_mulai !== undefined) push('tanggal_mulai', body.tanggal_mulai || null)
    if (body?.tanggal_selesai !== undefined) push('tanggal_selesai', body.tanggal_selesai || null)

    if (fields.length) {
      params.push(id)
      await run(`UPDATE tahun_ajaran SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }
    return (await q<Row>(
      `SELECT id, nama, to_char(tanggal_mulai, 'YYYY-MM-DD') AS tanggal_mulai, to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai, created_at, updated_at FROM tahun_ajaran WHERE id = $1`,
      [id]
    ))[0]!
  }

  if (method === 'DELETE') {
    if (id === await aktifTahunAjaranId()) {
      throw validationError('Tahun ajaran yang sedang aktif tidak bisa dihapus. Pilih tahun ajaran lain terlebih dahulu.')
    }
    await run(`DELETE FROM tahun_ajaran WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
