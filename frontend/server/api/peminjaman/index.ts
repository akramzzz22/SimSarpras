import { randomUUID } from 'node:crypto'
import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { paginate, validationError, aktifTahunAjaranId, logActivity } from '../../utils/helpers'
import { BARANG_COLS, PEMINJAMAN_COLS, attachSimple, attachUser, attachBarang, mapRows } from '../../utils/relations'

const STATUS_AKTIF = ['menunggu', 'disetujui', 'dipinjam']

function tambahTandaTerlambat(p: Row): void {
  const aktif = p.status === 'disetujui' || p.status === 'dipinjam'
  const tgl = String(p.tanggal_pinjam ?? '')
  p.terlambat = aktif && tgl < new Date().toISOString().slice(0, 10)
}

async function cekBentrok(barangId: number, tanggal: string, jamMulai: string, jamSelesai: string, kecualiId?: number): Promise<boolean> {
  const rows = await q<Row>(
    `SELECT 1 FROM peminjaman
     WHERE barang_id = $1 AND tanggal_pinjam = $2
       AND status = ANY($3)
       AND jam_mulai < $4::time AND jam_selesai > $5::time
       AND ($6::int IS NULL OR id <> $6) LIMIT 1`,
    [barangId, tanggal, STATUS_AKTIF, jamSelesai, jamMulai, kecualiId ?? null]
  )
  return rows.length > 0
}

async function slotDalamJadwal(barangId: number, tanggal: string, jamMulai: string, jamSelesai: string): Promise<boolean | null> {
  const ada = await q(`SELECT 1 FROM barang_jadwal WHERE barang_id = $1 LIMIT 1`, [barangId])
  if (!ada.length) return null // mode lama: barang tanpa jadwal tetap boleh dipinjam

  const d = new Date(tanggal + 'T00:00:00')
  const hari = ((d.getDay() + 6) % 7) + 1 // 1=Senin ... 7=Minggu (date('N'))

  const slots = await q<Row>(
    `SELECT 1 FROM barang_jadwal
     WHERE barang_id = $1 AND hari = $2 AND status = 'available'
       AND jam_mulai <= $3::time AND jam_selesai >= $4::time LIMIT 1`,
    [barangId, hari, jamMulai, jamSelesai]
  )
  return slots.length > 0
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ===== GET: daftar peminjaman =====
  if (method === 'GET') {
    const query = getQuery(event)
    const conds: string[] = []
    const params: unknown[] = []
    const aktifId = await aktifTahunAjaranId()
    if (aktifId) { conds.push(`tahun_ajaran_id = $${params.length + 1}`); params.push(aktifId) }
    if (query.status) { conds.push(`status = $${params.length + 1}`); params.push(String(query.status)) }
    if (query.status_in) {
      conds.push(`status = ANY($${params.length + 1})`)
      params.push(String(query.status_in).split(','))
    }
    if (query.terlambat) {
      conds.push(`status = ANY($${params.length + 1}) AND tanggal_pinjam < $${params.length + 2}::date`)
      params.push(['disetujui', 'dipinjam'], new Date().toISOString().slice(0, 10))
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const result = await paginate(event, `SELECT ${PEMINJAMAN_COLS} FROM peminjaman ${where} ORDER BY created_at DESC, id DESC`, params)

    await attachBarang(result.data, 'barang_id', 'barang', { nested: true })
    await attachUser(result.data, 'peminjam_id', 'peminjam')
    await attachUser(result.data, 'disetujui_oleh', 'penyetuju')
    for (const p of result.data) tambahTandaTerlambat(p)
    return result
  }

  // ===== POST: ajukan peminjaman (guru/murid) =====
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))

  const errors: Record<string, string[]> = {}
  const barangIdsRaw = body?.barang_ids
  if (!Array.isArray(barangIdsRaw) || barangIdsRaw.length === 0) {
    errors.barang_ids = ['Pilih minimal satu barang.']
  }
  const rawBarangIds = Array.isArray(barangIdsRaw) ? barangIdsRaw : []
  const barangIds: number[] = [...new Set(
    rawBarangIds.map((v) => Number(v)).filter((v): v is number => Number.isInteger(v) && v > 0)
  )]
  if (barangIds.length === 0) errors.barang_ids = ['Barang tidak valid.']
  if (!body?.tanggal_pinjam) errors.tanggal_pinjam = ['Tanggal pinjam wajib diisi.']
  if (!/^\d{2}:\d{2}$/.test(String(body?.jam_mulai ?? ''))) errors.jam_mulai = ['Jam mulai tidak valid.']
  if (!/^\d{2}:\d{2}$/.test(String(body?.jam_selesai ?? ''))) {
    errors.jam_selesai = ['Jam selesai tidak valid.']
  } else if (String(body.jam_selesai) <= String(body.jam_mulai)) {
    errors.jam_selesai = ['Jam selesai harus setelah jam mulai.']
  }
  if (!body?.foto_pinjam) errors.foto_pinjam = ['Foto barang wajib diunggah.']
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const tanggal = String(body.tanggal_pinjam)
  const jamMulai = String(body.jam_mulai)
  const jamSelesai = String(body.jam_selesai)

  // Validasi ketersediaan tiap barang dalam paket sekaligus.
  const barangs = await q<Row>(`SELECT ${BARANG_COLS} FROM barang WHERE id = ANY($1)`, [barangIds])
  const masalah: string[] = []
  const barangMap = await mapRows(barangs)
  for (const id of barangIds) {
    const barang = barangMap.get(id)
    if (!barang) { masalah.push('Barang tidak ditemukan.'); continue }
    if (barang.bisa_dipinjam === false) { masalah.push(`Barang "${barang.nama}" tidak bisa dipinjam.`); continue }
    if (barang.status === 'rusak' || barang.status === 'maintenance') {
      masalah.push(`Barang "${barang.nama}" sedang ${barang.status === 'rusak' ? 'rusak' : 'dalam maintenance'} dan tidak dapat dipinjam.`)
      continue
    }
    const cocok = await slotDalamJadwal(id, tanggal, jamMulai, jamSelesai)
    if (cocok === false) {
      masalah.push(`Slot waktu tidak tersedia untuk barang "${barang.nama}" pada jadwal booking tersebut.`)
      continue
    }
    if (await cekBentrok(id, tanggal, jamMulai, jamSelesai)) {
      masalah.push(`Barang "${barang.nama}" sudah dipinjam pada tanggal & jam tersebut.`)
    }
  }
  if (masalah.length) throw validationError(masalah.join(' '))

  const kelompokId = barangIds.length > 1 ? randomUUID() : null
  const tahunAktifId = await aktifTahunAjaranId()
  const created: Row[] = []

  for (const barangId of barangIds) {
    const res = await run(
      `INSERT INTO peminjaman (barang_id, peminjam_id, status, tanggal_pinjam, jam_mulai, jam_selesai, keperluan, jenis, penanggung_jawab, foto_pinjam, kelompok_id, tahun_ajaran_id, created_at, updated_at)
       VALUES ($1,$2,'menunggu',$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) RETURNING id`,
      [
        barangId, user.id, tanggal, jamMulai, jamSelesai,
        body?.keperluan ?? null,
        body?.jenis === 'eskul' ? 'eskul' : 'pembelajaran',
        body?.penanggung_jawab ?? null,
        String(body.foto_pinjam),
        kelompokId, tahunAktifId
      ]
    )
    created.push((await q<Row>(`SELECT ${PEMINJAMAN_COLS} FROM peminjaman WHERE id = $1`, [res.rows[0].id]))[0]!)
  }

  await attachBarang(created, 'barang_id', 'barang')
  await attachUser(created, 'peminjam_id', 'peminjam')
  return created
})
