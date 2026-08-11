import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'
import { MURID_COLS, attachSimple, attachUser } from '../../utils/relations'

async function load(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${MURID_COLS} FROM murid WHERE id = $1`, [id]))[0] ?? null
}

async function attach(rows: Row[]): Promise<void> {
  await attachSimple(rows, 'kelas_id', 'kelas', 'kelas')
  await attachSimple(rows, 'jurusan_id', 'jurusan', 'jurusan')
  await attachSimple(rows, 'proli_id', 'proli', 'proli')
  await attachUser(rows, 'user_id', 'user')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const murid = await load(id)
  if (!murid) throw notFound('Murid tidak ditemukan.')

  if (method === 'GET') {
    await attach([murid])
    return murid
  }

  if (method === 'PUT') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengubah murid.')
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.nis !== undefined) {
      const nis = String(body.nis ?? '').trim()
      if (!nis) throw validationError('NIS wajib diisi.', { nis: ['NIS wajib diisi.'] })
      const dup = await q(`SELECT 1 FROM murid WHERE nis = $1 AND id <> $2 LIMIT 1`, [nis, id])
      if (dup.length) throw validationError('NIS sudah terdaftar.', { nis: ['NIS sudah terdaftar.'] })
      push('nis', nis)
    }
    if (body?.nama !== undefined) {
      if (!String(body.nama ?? '').trim()) throw validationError('Nama wajib diisi.', { nama: ['Nama wajib diisi.'] })
      push('nama', String(body.nama).trim())
    }
    if (body?.kelas_id !== undefined) push('kelas_id', Number(body.kelas_id))
    if (body?.jurusan_id !== undefined) push('jurusan_id', body.jurusan_id == null ? null : Number(body.jurusan_id))
    if (body?.proli_id !== undefined) push('proli_id', body.proli_id == null ? null : Number(body.proli_id))
    if (body?.tempat_lahir !== undefined) push('tempat_lahir', body.tempat_lahir)
    if (body?.tanggal_lahir !== undefined) push('tanggal_lahir', body.tanggal_lahir || null)
    if (body?.jenis_kelamin !== undefined) push('jenis_kelamin', body.jenis_kelamin || null)
    if (body?.alamat !== undefined) push('alamat', body.alamat)
    if (body?.no_hp !== undefined) push('no_hp', body.no_hp)
    if (body?.tahun_masuk !== undefined) push('tahun_masuk', body.tahun_masuk || null)

    if (fields.length) {
      params.push(id)
      await run(`UPDATE murid SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }

    // Sinkronkan nama/kelas/jurusan & data pribadi ke akun login bila ada.
    if (murid.user_id) {
      const updated = (await load(id))!
      const sync: string[] = []
      const sp: unknown[] = []
      const spush = (col: string, val: unknown) => { sync.push(`${col} = $${sp.length + 1}`); sp.push(val) }
      if (body?.nama !== undefined) spush('name', updated.nama)
      if (body?.kelas_id !== undefined) {
        const k = (await q<Row>(`SELECT nama FROM kelas WHERE id = $1`, [Number(body.kelas_id)]))[0]!
        spush('kelas', k?.nama ?? null)
      }
      if (body?.jurusan_id !== undefined) spush('jurusan_id', updated.jurusan_id)
      if (body?.tempat_lahir !== undefined) spush('tempat_lahir', updated.tempat_lahir)
      if (body?.tanggal_lahir !== undefined) spush('tanggal_lahir', updated.tanggal_lahir)
      if (body?.alamat !== undefined) spush('alamat', updated.alamat)
      if (body?.no_hp !== undefined) spush('no_hp', updated.no_hp)
      if (body?.jenis_kelamin !== undefined) spush('jenis_kelamin', updated.jenis_kelamin)
      if (sync.length) {
        sp.push(murid.user_id)
        await run(`UPDATE users SET ${sync.join(', ')}, updated_at = now() WHERE id = $${sp.length}`, sp)
      }
    }

    const updated = (await load(id))!
    await attach([updated])
    return updated
  }

  if (method === 'DELETE') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus murid.')
    const userId = murid.user_id
    await run(`DELETE FROM murid WHERE id = $1`, [id])
    if (userId) {
      const hasHistory = await q(
        `SELECT 1 FROM peminjaman WHERE peminjam_id = $1 LIMIT 1 UNION SELECT 1 FROM laporan_kerusakan WHERE pelapor_id = $1 LIMIT 1`,
        [userId]
      )
      if (!hasHistory.length) {
        await run(`DELETE FROM users WHERE id = $1`, [userId])
      }
    }
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
