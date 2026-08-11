import { q, run, withTransaction, type Row } from '../../utils/db'
import { requireAuth, requireRoles, hasRole } from '../../utils/auth'
import { notFound, validationError } from '../../utils/helpers'
import { PEMINJAMAN_COLS, attachBarang, attachUser } from '../../utils/relations'

const STATUS_BARANG_TERLARANG = ['rusak', 'maintenance']

async function loadPeminjaman(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [id]))[0] ?? null
}

/** Restore status barang ke 'aktif' bila tidak ada peminjaman aktif lain (dalam transaksi). */
async function restoreBarangStatus(tx: { q: typeof q; run: typeof run }, peminjaman: Row): Promise<void> {
  const masihAktif = await tx.q(
    `SELECT 1 FROM peminjaman WHERE barang_id = $1 AND id <> $2 AND status = ANY($3) LIMIT 1`,
    [peminjaman.barang_id, peminjaman.id, ['disetujui', 'dipinjam']]
  )
  if (masihAktif.length) return
  const barang = (await tx.q<Row>(`SELECT id, status FROM barang WHERE id = $1`, [peminjaman.barang_id]))[0]!
  if (barang && !STATUS_BARANG_TERLARANG.includes(barang.status)) {
    await tx.run(`UPDATE barang SET status = 'aktif', updated_at = now() WHERE id = $1`, [peminjaman.barang_id])
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const peminjaman = await loadPeminjaman(id)
  if (!peminjaman) throw notFound('Peminjaman tidak ditemukan.')

  // ===== GET: detail (peminjam sendiri / admin / kaproli / staff) =====
  if (method === 'GET') {
    const allowed = user.id === peminjaman.peminjam_id || hasRole(user, ['admin', 'kaproli', 'staff_sarpras'])
    if (!allowed) throw createError({ statusCode: 403, statusMessage: 'Anda tidak berhak melihat peminjaman ini.' })

    await attachBarang([peminjaman], 'barang_id', 'barang', { nested: true })
    await attachUser([peminjaman], 'peminjam_id', 'peminjam')
    await attachUser([peminjaman], 'disetujui_oleh', 'penyetuju')

    if (peminjaman.kelompok_id) {
      const anggota = await q<Row>(
        `SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE kelompok_id = $1 ORDER BY id`,
        [peminjaman.kelompok_id]
      )
      await attachBarang(anggota, 'barang_id', 'barang', { nested: true })
      return { ...peminjaman, kelompok: anggota }
    }
    return peminjaman
  }

  // ===== DELETE: hapus (admin/staff) + restore status & stok barang =====
  if (method === 'DELETE') {
    requireRoles(event, user, ['admin', 'staff_sarpras'], 'Hanya Admin / Staff Sarpras yang dapat menghapus peminjaman.')
    if (['disetujui', 'dipinjam'].includes(peminjaman.status)) {
      await withTransaction(async (tx) => {
        // Stok yang tadi dikurangi saat approve dikembalikan
        const perlu = Number(peminjaman.jumlah ?? 1)
        await tx.run(`UPDATE barang SET jumlah = jumlah + $1, updated_at = now() WHERE id = $2`, [perlu, peminjaman.barang_id])
        await restoreBarangStatus(tx, peminjaman)
        await tx.run(`DELETE FROM peminjaman WHERE id = $1`, [id])
      })
    } else {
      await run(`DELETE FROM peminjaman WHERE id = $1`, [id])
    }
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
