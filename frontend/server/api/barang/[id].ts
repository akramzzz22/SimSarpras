import { q, run, type Row } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { validationError, logActivity, notFound } from '../../utils/helpers'
import { BARANG_COLS, attachSimple, attachLaporanList, attachPeminjamanList } from '../../utils/relations'

async function loadBarang(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE id = $1`, [id]))[0] ?? null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const barang = await loadBarang(id)
  if (!barang) throw notFound('Barang tidak ditemukan.')

  // ===== GET: detail =====
  if (method === 'GET') {
    await attachSimple([barang], 'proli_id', 'proli', 'proli')
    await attachSimple([barang], 'kategori_id', 'kategori', 'kategori_barang')
    await attachSimple([barang], 'ruangan_id', 'ruangan', 'ruangan')
    await attachLaporanList([barang], 'barang_id', 'laporanKerusakan')
    await attachPeminjamanList([barang], 'barang_id', 'peminjaman')
    return barang
  }

  // ===== PUT: update (admin) =====
  if (method === 'PUT') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengubah barang.')
    const body = await readBody(event).catch(() => ({}))

    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }

    if (body?.nama !== undefined) {
      if (!String(body.nama).trim()) throw validationError('Nama barang wajib diisi.', { nama: ['Nama barang wajib diisi.'] })
      push('nama', String(body.nama).trim())
    }
    if (body?.deskripsi !== undefined) push('deskripsi', body.deskripsi === '' ? null : body.deskripsi)
    if (body?.owner_type !== undefined) {
      if (!['sarpras', 'proli'].includes(body.owner_type)) throw validationError('Owner tidak valid.')
      push('owner_type', body.owner_type)
    }
    for (const [col, key] of [['proli_id', 'proli_id'], ['kategori_id', 'kategori_id'], ['ruangan_id', 'ruangan_id'], ['satuan_id', 'satuan_id'], ['kondisi_id', 'kondisi_id'], ['sumber_dana_id', 'sumber_dana_id']] as const) {
      if (body?.[key] !== undefined) push(col, body[key] === '' || body[key] === null ? null : Number(body[key]))
    }
    if (body?.status !== undefined) {
      if (!['aktif', 'rusak', 'dipinjam', 'maintenance'].includes(body.status)) throw validationError('Status tidak valid.')
      push('status', body.status)
    }
    if (body?.bisa_dipinjam !== undefined) push('bisa_dipinjam', Boolean(body.bisa_dipinjam))
    if (body?.jumlah !== undefined) {
      const j = Number(body.jumlah)
      if (!Number.isInteger(j) || j < 1) throw validationError('Jumlah minimal 1.', { jumlah: ['Jumlah minimal 1.'] })
      push('jumlah', j)
    }

    if (fields.length) {
      params.push(id)
      await run(`UPDATE barang SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }

    const updated = (await loadBarang(id))!
    await logActivity('update', `Mengubah barang "${updated.nama}"`, { type: 'App\\Models\\Barang', id }, user.id)
    await attachSimple([updated], 'proli_id', 'proli', 'proli')
    await attachSimple([updated], 'kategori_id', 'kategori', 'kategori_barang')
    await attachSimple([updated], 'ruangan_id', 'ruangan', 'ruangan')
    await attachSimple([updated], 'satuan_id', 'satuan', 'satuan')
    await attachSimple([updated], 'kondisi_id', 'kondisi', 'kondisi_barang')
    await attachSimple([updated], 'sumber_dana_id', 'sumberDana', 'sumber_dana')
    return updated
  }

  // ===== DELETE: hapus (admin) =====
  if (method === 'DELETE') {
    requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus barang.')
    await logActivity('delete', `Menghapus barang "${barang.nama}"`, { type: 'App\\Models\\Barang', id }, user.id)
    await run(`DELETE FROM barang WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
