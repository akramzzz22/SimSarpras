import { q, run } from '../../utils/db'
import { requireAuth, requireRoles } from '../../utils/auth'
import { validationError } from '../../utils/helpers'

const DEFAULTS = {
  nama_aplikasi: 'Aplikasi Sarpras',
  pengumuman: 'Selamat datang di Aplikasi Sarpras SMKN 4 Bandung — kelola aset, peminjaman, dan maintenance sekolah dengan mudah.',
  max_hari_pinjam: 7,
  max_barang_pinjam: 5,
  jam_mulai: '07:30',
  jam_selesai: '15:30',
  mode_pemeliharaan: false
}

async function baca(): Promise<Record<string, unknown>> {
  const s = await q(`SELECT aturan FROM page_settings WHERE page_key = 'sistem' LIMIT 1`)
  let stored: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(s[0]?.aturan ?? '')
    if (parsed && typeof parsed === 'object') stored = parsed
  } catch {
    stored = {}
  }
  return { ...DEFAULTS, ...stored }
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return baca()
  }

  // PUT (admin)
  const user = await requireAuth(event)
  requireRoles(event, user, 'admin', 'Hanya admin yang dapat mengakses fitur ini.')
  const body = await readBody(event).catch(() => ({}))

  const errors: Record<string, string[]> = {}
  if (!String(body?.nama_aplikasi ?? '').trim()) errors.nama_aplikasi = ['Nama aplikasi wajib diisi.']
  if (body?.max_hari_pinjam !== undefined && (!Number.isInteger(Number(body.max_hari_pinjam)) || Number(body.max_hari_pinjam) < 1)) {
    errors.max_hari_pinjam = ['Maksimal hari pinjam tidak valid.']
  }
  if (body?.max_barang_pinjam !== undefined && (!Number.isInteger(Number(body.max_barang_pinjam)) || Number(body.max_barang_pinjam) < 1)) {
    errors.max_barang_pinjam = ['Maksimal barang pinjam tidak valid.']
  }
  if (body?.jam_mulai !== undefined && !/^\d{2}:\d{2}$/.test(String(body.jam_mulai))) errors.jam_mulai = ['Jam mulai tidak valid.']
  if (body?.jam_selesai !== undefined && !/^\d{2}:\d{2}$/.test(String(body.jam_selesai))) errors.jam_selesai = ['Jam selesai tidak valid.']
  if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

  const data = {
    nama_aplikasi: String(body?.nama_aplikasi ?? DEFAULTS.nama_aplikasi).trim(),
    pengumuman: body?.pengumuman ?? DEFAULTS.pengumuman,
    max_hari_pinjam: Number(body?.max_hari_pinjam ?? DEFAULTS.max_hari_pinjam),
    max_barang_pinjam: Number(body?.max_barang_pinjam ?? DEFAULTS.max_barang_pinjam),
    jam_mulai: String(body?.jam_mulai ?? DEFAULTS.jam_mulai),
    jam_selesai: String(body?.jam_selesai ?? DEFAULTS.jam_selesai),
    mode_pemeliharaan: Boolean(body?.mode_pemeliharaan)
  }

  const exists = await q(`SELECT 1 FROM page_settings WHERE page_key = 'sistem' LIMIT 1`)
  if (exists.length) {
    await run(
      `UPDATE page_settings SET page_name = 'Pengaturan Sistem', aturan = $1, updated_at = now() WHERE page_key = 'sistem'`,
      [JSON.stringify(data)]
    )
  } else {
    await run(
      `INSERT INTO page_settings (page_key, page_name, aturan, created_at, updated_at)
       VALUES ('sistem', 'Pengaturan Sistem', $1, now(), now())`,
      [JSON.stringify(data)]
    )
  }

  return data
})
