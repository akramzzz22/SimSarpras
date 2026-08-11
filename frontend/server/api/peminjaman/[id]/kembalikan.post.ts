import { withTransaction, type Row } from '../../../utils/db'
import { requireAuth, requireRoles } from '../../../utils/auth'
import { notFound, validationError, logActivity } from '../../../utils/helpers'
import { PEMINJAMAN_COLS, attachBarang, attachUser } from '../../../utils/relations'

const STATUS_BARANG_TERLARANG = ['rusak', 'maintenance']

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, ['admin', 'staff_sarpras'], 'Anda tidak berhak mencatat pengembalian barang.')

  const id = Number(getRouterParam(event, 'id'))

  const body = await readBody(event).catch(() => ({}))
  if (!body?.foto_kembali) {
    throw validationError('Foto barang wajib diunggah.', { foto_kembali: ['Foto barang wajib diunggah.'] })
  }

  // Transaksi: catat pengembalian + kembalikan stok barang
  await withTransaction(async (tx) => {
    const peminjaman = (await tx.q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1 FOR UPDATE`, [id]))[0] ?? null
    if (!peminjaman) throw notFound('Peminjaman tidak ditemukan.')

    if (!['disetujui', 'dipinjam'].includes(peminjaman.status)) {
      throw validationError('Peminjaman dengan status ini tidak dapat dikembalikan.')
    }

    await tx.run(`UPDATE peminjaman SET status = 'dikembalikan', foto_kembali = $1, updated_at = now() WHERE id = $2`, [String(body.foto_kembali), id])

    // Stok dikembalikan saat pengembalian tercatat
    const perlu = Number(peminjaman.jumlah ?? 1)
    await tx.run(`UPDATE barang SET jumlah = jumlah + $1, updated_at = now() WHERE id = $2`, [perlu, peminjaman.barang_id])

    // Satu barang bisa punya beberapa peminjaman aktif di tanggal berbeda.
    const masihAktif = await tx.q(
      `SELECT 1 FROM peminjaman WHERE barang_id = $1 AND id <> $2 AND status = ANY($3) LIMIT 1`,
      [peminjaman.barang_id, id, ['disetujui', 'dipinjam']]
    )
    if (!masihAktif.length) {
      const barang = (await tx.q<Row>(`SELECT id, status FROM barang WHERE id = $1`, [peminjaman.barang_id]))[0]!
      if (barang && !STATUS_BARANG_TERLARANG.includes(barang.status)) {
        await tx.run(`UPDATE barang SET status = 'aktif', updated_at = now() WHERE id = $1`, [peminjaman.barang_id])
      }
    }
  })

  await logActivity('kembali', `Mencatat pengembalian peminjaman #${id}`, { type: 'App\\Models\\Peminjaman', id }, user.id)

  const updated = (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0]!
  await attachBarang([updated], 'barang_id', 'barang')
  await attachUser([updated], 'peminjam_id', 'peminjam')
  return updated
})
