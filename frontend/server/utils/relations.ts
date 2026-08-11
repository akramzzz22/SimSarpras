import { q, type Row } from './db'

// ============ KOLOM (format serialisasi API) ============
export const USER_COLS = `id, name, email, email_verified_at, kelas, jurusan_id, foto, jenis_kelamin, is_active, failed_login_count, nip, nuptk, tempat_lahir, to_char(tanggal_lahir, 'YYYY-MM-DD') AS tanggal_lahir, alamat, no_hp, created_at, updated_at`

export const BARANG_COLS = `id, nama, kode_qr, owner_type, proli_id, kategori_id, ruangan_id, status, created_at, updated_at, deskripsi, bisa_dipinjam, tahun_ajaran_id, satuan_id, kondisi_id, sumber_dana_id`

export const PEMINJAMAN_COLS = `id, barang_id, peminjam_id, status, to_char(tanggal_pinjam, 'YYYY-MM-DD') AS tanggal_pinjam, disetujui_oleh, created_at, updated_at, to_char(jam_mulai, 'HH24:MI') AS jam_mulai, to_char(jam_selesai, 'HH24:MI') AS jam_selesai, foto_pinjam, foto_kembali, keperluan, tahun_ajaran_id, kelompok_id, jenis, penanggung_jawab`

export const LAPORAN_COLS = `id, barang_id, pelapor_id, deskripsi, foto_url, status, assigned_to, vendor_id, hasil_perbaikan_url, created_at, updated_at, tahun_ajaran_id, jenis_kerusakan_id, tingkat_kerusakan_id`

export const MAINTENANCE_COLS = `id, barang_id, to_char(tanggal_jadwal, 'YYYY-MM-DD') AS tanggal_jadwal, staff_id, vendor_id, status, dokumentasi_url, catatan, created_at, updated_at, biaya, resi_url, tahun_ajaran_id, jenis_maintenance_id`

export const MURID_COLS = `id, nis, nama, jurusan_id, proli_id, created_at, updated_at, kelas_id, user_id, tahun_ajaran_id, tempat_lahir, to_char(tanggal_lahir, 'YYYY-MM-DD') AS tanggal_lahir, jenis_kelamin, alamat, no_hp, tahun_masuk`

export const MUTASI_COLS = `id, barang_id, jenis, to_char(tanggal, 'YYYY-MM-DD') AS tanggal, jumlah, keterangan, ruangan_asal_id, ruangan_tujuan_id, user_id, created_at, updated_at`

const SIMPLE_COLS = `id, nama, created_at, updated_at`

async function mapRows(rows: Row[], idKey = 'id'): Promise<Map<any, Row>> {
  const m = new Map<any, Row>()
  for (const r of rows) m.set(r[idKey], r)
  return m
}

/** Lampirkan relasi belongsTo dari tabel "simple" (id+nama). */
export async function attachSimple(rows: Row[], idField: string, relName: string, table: string): Promise<void> {
  const ids = [...new Set(rows.map((r) => r[idField]).filter((v) => v !== null && v !== undefined))]
  for (const r of rows) r[relName] = null
  if (!ids.length) return
  const map = await mapRows(await q<Row>(`SELECT ${SIMPLE_COLS} FROM ${table} WHERE id = ANY($1)`, [ids]))
  for (const r of rows) {
    const v = map.get(r[idField])
    if (v) r[relName] = v
  }
}

/** Lampirkan relasi belongsTo ke tabel users (USER_COLS). */
export async function attachUser(rows: Row[], idField: string, relName: string): Promise<void> {
  const ids = [...new Set(rows.map((r) => r[idField]).filter((v) => v !== null && v !== undefined))]
  for (const r of rows) r[relName] = null
  if (!ids.length) return
  const map = await mapRows(await q<Row>(`SELECT ${USER_COLS} FROM users WHERE id = ANY($1)`, [ids]))
  for (const r of rows) {
    const v = map.get(r[idField])
    if (v) r[relName] = v
  }
}

/** Lampirkan relasi barang (plus opsi kategori/ruangan bersarang). */
export async function attachBarang(rows: Row[], idField: string, relName: string, opts: { nested?: boolean } = {}): Promise<void> {
  const ids = [...new Set(rows.map((r) => r[idField]).filter((v) => v !== null && v !== undefined))]
  for (const r of rows) r[relName] = null
  if (!ids.length) return
  const barangs = await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE id = ANY($1)`, [ids])
  if (opts.nested) {
    await attachSimple(barangs, 'kategori_id', 'kategori', 'kategori_barang')
    await attachSimple(barangs, 'ruangan_id', 'ruangan', 'ruangan')
  }
  const map = await mapRows(barangs)
  for (const r of rows) {
    const v = map.get(r[idField])
    if (v) r[relName] = v
  }
}

/** Lampirkan relasi murid ke user (murid.user_id → users.id), untuk daftar users. */
export async function attachMurid(rows: Row[], idField: string, relName: string): Promise<void> {
  const ids = [...new Set(rows.map((r) => r[idField]).filter((v) => v !== null && v !== undefined))]
  for (const r of rows) r[relName] = null
  if (!ids.length) return
  const murids = await q<Row>(`SELECT ${MURID_COLS} FROM murid WHERE user_id = ANY($1)`, [ids])
  const map = await mapRows(murids, 'user_id')
  for (const r of rows) {
    const v = map.get(r[idField])
    if (v) r[relName] = v
  }
}

/** Lampirkan relasi ruangan + gedung bersarang (untuk byKode). */
export async function attachRuanganGedung(rows: Row[], idField: string, relName: string): Promise<void> {
  const ids = [...new Set(rows.map((r) => r[idField]).filter((v) => v !== null && v !== undefined))]
  for (const r of rows) r[relName] = null
  if (!ids.length) return
  const ruangans = await q<Row>(`SELECT id, nama, gedung_id, created_at, updated_at FROM ruangan WHERE id = ANY($1)`, [ids])
  const gIds = [...new Set(ruangans.map((r) => r.gedung_id).filter((v) => v !== null && v !== undefined))]
  if (gIds.length) {
    const g = await q<Row>(`SELECT id, nama, created_at, updated_at FROM gedung WHERE id = ANY($1)`, [gIds])
    const gm = await mapRows(g)
    for (const r of ruangans) r.gedung = gm.get(r.gedung_id) ?? null
  }
  const map = await mapRows(ruangans)
  for (const r of rows) {
    const v = map.get(r[idField])
    if (v) r[relName] = v
  }
}

/** Lampirkan hasMany laporan kerusakan (dengan pelapor) ke barang. */
export async function attachLaporanList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const laporans = await q<Row>(`SELECT ${LAPORAN_COLS} FROM laporan_kerusakan WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  await attachUser(laporans, 'pelapor_id', 'pelapor')
  const m = new Map<number, Row[]>()
  for (const l of laporans) {
    const arr = m.get(l[idField]) ?? []
    arr.push(l)
    m.set(l[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany peminjaman (dengan peminjam) ke barang. */
export async function attachPeminjamanList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const pems = await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  await attachUser(pems, 'peminjam_id', 'peminjam')
  const m = new Map<number, Row[]>()
  for (const p of pems) {
    const arr = m.get(p[idField]) ?? []
    arr.push(p)
    m.set(p[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany maintenance ke vendor. */
export async function attachMaintenanceList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const list = await q<Row>(`SELECT ${MAINTENANCE_COLS} FROM maintenance WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  const m = new Map<number, Row[]>()
  for (const l of list) {
    const arr = m.get(l[idField]) ?? []
    arr.push(l)
    m.set(l[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany barang ke proli/ruangan/kategori. */
export async function attachBarangList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const list = await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  const m = new Map<number, Row[]>()
  for (const l of list) {
    const arr = m.get(l[idField]) ?? []
    arr.push(l)
    m.set(l[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany ruangan ke gedung. */
export async function attachRuanganList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const list = await q<Row>(`SELECT id, nama, gedung_id, created_at, updated_at FROM ruangan WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  const m = new Map<number, Row[]>()
  for (const l of list) {
    const arr = m.get(l[idField]) ?? []
    arr.push(l)
    m.set(l[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany proli ke jurusan. */
export async function attachProliList(rows: Row[], idField: string, relName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const list = await q<Row>(`SELECT id, nama, jurusan_id, ketua_proli_id, created_at, updated_at FROM proli WHERE ${idField} = ANY($1) ORDER BY created_at DESC, id DESC`, [ids])
  const m = new Map<number, Row[]>()
  for (const l of list) {
    const arr = m.get(l[idField]) ?? []
    arr.push(l)
    m.set(l[idField], arr)
  }
  for (const r of rows) r[relName] = m.get(r.id) ?? []
}

/** Lampirkan hasMany sederhana dengan count (mis. gedung → ruangan). */
export async function attachCount(rows: Row[], relTable: string, fk: string, countName: string): Promise<void> {
  if (!rows.length) return
  const ids = rows.map((r) => r.id)
  const counts = await q<Row>(`SELECT ${fk} AS parent_id, count(*) AS total FROM ${relTable} WHERE ${fk} = ANY($1) GROUP BY ${fk}`, [ids])
  const m = new Map(counts.map((c) => [c.parent_id, Number(c.total)]))
  for (const r of rows) r[countName] = m.get(r.id) ?? 0
}

export { mapRows }
