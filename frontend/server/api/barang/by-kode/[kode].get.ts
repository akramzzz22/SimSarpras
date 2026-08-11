import { q, type Row } from '../../../utils/db'
import { notFound } from '../../../utils/helpers'
import { BARANG_COLS, attachSimple, attachRuanganGedung, attachLaporanList, attachPeminjamanList } from '../../../utils/relations'

export default defineEventHandler(async (event) => {
  const kode = decodeURIComponent(getRouterParam(event, 'kode') ?? '')
  const barang = (await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE kode_qr = $1 LIMIT 1`, [kode]))[0] ?? null

  if (!barang) throw notFound('Barang tidak ditemukan.')

  await attachSimple([barang], 'proli_id', 'proli', 'proli')
  await attachSimple([barang], 'kategori_id', 'kategori', 'kategori_barang')
  await attachRuanganGedung([barang], 'ruangan_id', 'ruangan')
  await attachLaporanList([barang], 'barang_id', 'laporanKerusakan')
  await attachPeminjamanList([barang], 'barang_id', 'peminjaman')

  return barang
})
