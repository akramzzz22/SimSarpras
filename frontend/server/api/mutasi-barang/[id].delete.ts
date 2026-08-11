import { withTransaction } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { notFound } from '../../utils/helpers'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat menghapus mutasi barang.')
  const id = Number(getRouterParam(event, 'id'))

  // Transaksi: hapus catatan + rollback stok barang (masuk -n, keluar +n) secara atomik
  await withTransaction(async (tx) => {
    const m = (await tx.q<{ barang_id: number; jenis: string; jumlah: number }>(
      `SELECT barang_id, jenis, jumlah FROM mutasi_barang WHERE id = $1`, [id]
    ))[0]
    if (!m) throw notFound('Mutasi tidak ditemukan.')

    const deleted = await tx.run(`DELETE FROM mutasi_barang WHERE id = $1`, [id])
    if (!deleted.rowCount) throw notFound('Mutasi tidak ditemukan.')

    if (m.jenis === 'masuk') {
      await tx.run(`UPDATE barang SET jumlah = GREATEST(0, jumlah - $1), updated_at = now() WHERE id = $2`, [m.jumlah, m.barang_id])
    } else if (m.jenis === 'keluar') {
      await tx.run(`UPDATE barang SET jumlah = jumlah + $1, updated_at = now() WHERE id = $2`, [m.jumlah, m.barang_id])
    }
    // jenis 'pindah' tidak mengubah stok — tidak perlu rollback
  })

  return null
})
