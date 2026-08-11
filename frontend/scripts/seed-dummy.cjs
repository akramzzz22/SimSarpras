#!/usr/bin/env node
/* ============================================================
   SEED DUMMY — data murid, PTK, dan barang
   ------------------------------------------------------------
   Menambahkan data dummy ke database PostgreSQL 'sarpras'
   (koneksi sama dengan server: env DB_HOST/DB_PORT/DB_USERNAME/
   DB_PASSWORD/DB_DATABASE, bawaan 127.0.0.1:5432 postgres/postgres).

   Pemakaian:
     node scripts/seed-dummy.cjs
     SEED_MURID=200 SEED_PTK=40 node scripts/seed-dummy.cjs
     SEED_PASSWORD=rahasia123 node scripts/seed-dummy.cjs

   Variabel env (opsional):
   SEED_MURID        jumlah murid (default 300)
   SEED_PTK          jumlah PTK  (default 50)
   SEED_BARANG       jumlah barang dummy (default 200)
   SEED_PASSWORD     password default akun PTK (default password123)
     SEED_EMAIL_DOMAIN domain email dummy (default smkn4.test)

   CATATAN: script utilitas dev (boleh ikut commit, seperti gen-logo.py).
   Menjalankannya MENAMBAH baris — data yang sudah ada TIDAK dihapus.
   ============================================================ */
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE || 'sarpras',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 5
})

const JUMLAH_MURID = Number(process.env.SEED_MURID || 300)
const JUMLAH_PTK = Number(process.env.SEED_PTK || 50)
const JUMLAH_BARANG = Number(process.env.SEED_BARANG || 200)
const PTK_PASSWORD = String(process.env.SEED_PASSWORD || 'password123')
const EMAIL_DOMAIN = String(process.env.SEED_EMAIL_DOMAIN || 'smkn4.test')

/* ============ Generator data Indonesia ============ */
const NAMA_DEPAN = [
  'Agus', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko',
  'Kurnia', 'Lestari', 'Made', 'Naufal', 'Oktavia', 'Putri', 'Rizky', 'Sari', 'Teguh', 'Utami',
  'Wulan', 'Yoga', 'Zaki', 'Andini', 'Bima', 'Cahyo', 'Dinda', 'Erlangga', 'Farhan', 'Galih',
  'Hana', 'Ilham', 'Jasmine', 'Kevin', 'Laila', 'Miftah', 'Nadia', 'Oki', 'Pramudya', 'Qori',
  'Raka', 'Sinta', 'Tiara', 'Umar', 'Vina', 'Wira', 'Yusuf', 'Zainab', 'Aditya', 'Bella',
  'Chandra', 'Dwi', 'Eko', 'Fikri', 'Gadis', 'Hesti', 'Iqbal', 'Jihan', 'Kiki', 'Luthfi',
  'Mira', 'Nanda', 'Ovi', 'Putra', 'Rafi', 'Salma', 'Taufik', 'Ulya', 'Vino', 'Wati'
]
const NAMA_BELAKANG = [
  'Pratama', 'Saputra', 'Wijaya', 'Nugroho', 'Hidayat', 'Susanto', 'Ramadhan', 'Firmansyah',
  'Maulana', 'Santoso', 'Setiawan', 'Gunawan', 'Wibowo', 'Kurniawan', 'Permana', 'Rahmawati',
  'Sari', 'Utami', 'Lestari', 'Anggraini', 'Hasanah', 'Wahyuni', 'Ningsih', 'Aulia', 'Putri',
  'Amelia', 'Salsabila', 'Zahra', 'Damayanti', 'Oktaviani', 'Marlina', 'Puspita', 'Yulianti',
  'Kusuma', 'Dewanti', 'Rahayu', 'Handayani', 'Wulandari', 'Permatasari', 'Febrianti',
  'Pangestu', 'Siregar', 'Halim', 'Rusli', 'Arifin', 'Syafiq', 'Nasution', 'Karim', 'Fauzi', 'Iskandar'
]
const KOTA = [
  'Bandung', 'Cimahi', 'Garut', 'Tasikmalaya', 'Cianjur', 'Sukabumi', 'Bogor', 'Bekasi',
  'Karawang', 'Subang', 'Sumedang', 'Purwakarta', 'Indramayu', 'Cirebon', 'Majalengka',
  'Kuningan', 'Banjar', 'Ciamis', 'Pangandaran', 'Banjaran'
]
const JALAN = [
  'Merdeka', 'Asia Afrika', 'Dipatiukur', 'Dago', 'Setiabudi', 'Sukajadi', 'Riau', 'Braga',
  'Cihampelas', 'Buah Batu', 'Soekarno-Hatta', 'Ahmad Yani', 'Pahlawan', 'Gatot Subroto',
  'Sudirman', 'Gajah Mada', 'Hayam Wuruk', 'Veteran', 'Cendana', 'Mawar', 'Melati', 'Anggrek',
  'Kenanga', 'Flamboyan', 'Cempaka', 'Dahlia', 'Bougenville', 'Kartini', 'Diponegoro', 'Juanda'
]

function acak(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function angka(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function tanggalAcak(awalTahun, akhirTahun) {
  const t = new Date(angka(awalTahun, akhirTahun), angka(0, 11), angka(1, 28))
  return t.toISOString().slice(0, 10)
}
function namaLengkap() { return `${acak(NAMA_DEPAN)} ${acak(NAMA_BELAKANG)}` }
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
}
function alamatAcak() {
  return `Jl. ${acak(JALAN)} No. ${angka(1, 220)} RT 0${angka(1, 9)} RW 0${angka(1, 9)}, Kec. ${acak(KOTA)}`
}
function noHpAcak() {
  const pref = acak(['0812', '0821', '0857', '0896', '0878'])
  let s = ''
  for (let i = 0; i < 8; i++) s += angka(0, 9)
  return pref + s
}

/* ============ Katalog dummy barang ============ */
const KATALOG_ELEKTRONIK = [
  'Komputer', 'Monitor', 'Laptop', 'Proyektor', 'Printer', 'AC Split', 'Televisi',
  'Speaker Aktif', 'Access Point', 'UPS', 'Scanner', 'Mesin Fotokopi', 'Kabel LAN',
  'Switch Hub', 'Sound System', 'CCTV', 'Mic Wireless', 'Layar Proyektor'
]
const KATALOG_FURNITUR = [
  'Meja', 'Kursi', 'Lemari Arsip', 'Rak Buku', 'Papan Tulis', 'Sofa', 'Meja Rapat',
  'Kursi Tamu', 'Rak Display', 'Meja Komputer', 'Kursi Guru', 'Buffet TV', 'Tempat Sampah'
]
const KATALOG_BANGUNAN = [
  'Pintu', 'Jendela', 'Lampu Penerangan', 'Kipas Angin Dinding', 'Kaca', 'Partisi Ruangan'
]
// Satuan khusus per jenis barang (selain satuan default kategori)
const SATUAN_KHUSUS = { 'Kabel LAN': 'Meter', 'Sound System': 'Set', 'Speaker Aktif': 'Buah' }
// Ruangan lab -> proli pemilik (barang praktik milik proli, bukan sarpras)
const LAB_PROLI = {
  'Lab RPL': 5, 'Lab TKJ': 4, 'Lab TAV': 3, 'Lab TITL': 1, 'Lab TOI': 2, 'Lab DKV': 6
}

/* ============ Main ============ */
async function main() {
  const client = await pool.connect()
  let jumlahMurid = 0
  let jumlahPtk = 0
  let jumlahBarang = 0
  const contohPtk = []

  try {
    await client.query('BEGIN')

    // --- Data master ---
    const kelasRows = (await client.query('SELECT id, nama, jurusan_id FROM kelas ORDER BY id')).rows
    const proliRows = (await client.query('SELECT id, nama, jurusan_id FROM proli')).rows
    const roleRows = (await client.query('SELECT id, name FROM roles')).rows
    const kategoriRows = (await client.query('SELECT id, nama FROM kategori_barang ORDER BY id')).rows
    const satuanRows = (await client.query('SELECT id, nama FROM satuan ORDER BY id')).rows
    const kondisiRows = (await client.query('SELECT id, nama FROM kondisi_barang ORDER BY id')).rows
    const sumberDanaRows = (await client.query('SELECT id, nama FROM sumber_dana ORDER BY id')).rows
    const ruanganRows = (await client.query('SELECT id, nama FROM ruangan ORDER BY id')).rows
    const roleId = (name) => roleRows.find((r) => r.name === name)?.id

    // Tahun ajaran aktif (page_settings) atau yang terbaru
    const ps = await client.query(
      `SELECT aturan FROM page_settings WHERE page_key = 'tahun-ajaran-aktif' LIMIT 1`
    )
    let tahunAktifId = null
    try { tahunAktifId = Number(JSON.parse(ps.rows[0]?.aturan)?.tahun_ajaran_id) || null } catch {}
    if (!tahunAktifId) {
      tahunAktifId = Number((await client.query('SELECT max(id) id FROM tahun_ajaran')).rows[0].id)
    }

    // Nilai yang sudah ada (agar tidak bentrok)
    const nisAda = new Set((await client.query('SELECT nis FROM murid')).rows.map((r) => r.nis))
    const emailAda = new Set((await client.query('SELECT email FROM users WHERE email IS NOT NULL')).rows.map((r) => r.email))
    const nipAda = new Set((await client.query('SELECT nip FROM users WHERE nip IS NOT NULL')).rows.map((r) => r.nip))
    const kodeQrAda = new Set((await client.query('SELECT kode_qr FROM barang')).rows.map((r) => r.kode_qr))

    const roleMuridId = roleId('murid')
    const modelType = 'App\\Models\\User'

    if (!kelasRows.length) throw new Error('Tabel kelas kosong — seed master data dulu.')
    if (!roleMuridId) throw new Error('Role murid tidak ditemukan.')

    const now = new Date().toISOString()

    // ================= 1) MURID =================
    console.log(`→ Generate ${JUMLAH_MURID} murid...`)
    for (let i = 0; i < JUMLAH_MURID; i++) {
      const kelas = kelasRows[i % kelasRows.length] // merata ke semua kelas
      const proli = proliRows.find((p) => Number(p.jurusan_id) === Number(kelas.jurusan_id))

      let nis = String(25000000 + i + 1) // 8 digit unik
      while (nisAda.has(nis)) nis = String(Number(nis) + 1)
      nisAda.add(nis)

      const nama = namaLengkap()
      const jk = Math.random() < 0.5 ? 'L' : 'P'
      const tingkat = String(kelas.nama).startsWith('XII') ? 12 : String(kelas.nama).startsWith('XI') ? 11 : 10
      const tahunLahir = 2026 - tingkat - (Math.random() < 0.5 ? 1 : 2) // 15–17 tahun
      const tahunMasuk = tingkat === 10 ? 2025 : tingkat === 11 ? 2024 : 2023

      const ures = await client.query(
        `INSERT INTO users (name, email, password, kelas, jurusan_id, tempat_lahir, tanggal_lahir,
            alamat, no_hp, jenis_kelamin, is_active, failed_login_count, created_at, updated_at)
         VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, $7, $8, true, 0, $9, $9) RETURNING id`,
        [nama, kelas.nama, Number(kelas.jurusan_id), acak(KOTA), tanggalAcak(tahunLahir, tahunLahir),
          alamatAcak(), noHpAcak(), jk, now]
      )
      const userId = ures.rows[0].id
      await client.query(
        `INSERT INTO model_has_roles (role_id, model_type, model_id)
         SELECT $1, $2, $3 FROM roles WHERE name = 'murid'`,
        [roleMuridId, modelType, userId]
      )
      await client.query(
        `INSERT INTO murid (nis, nama, kelas_id, jurusan_id, proli_id, user_id, tahun_ajaran_id,
            tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_hp, tahun_masuk, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
        [nis, nama, Number(kelas.id), Number(kelas.jurusan_id), proli ? Number(proli.id) : null,
          userId, tahunAktifId, acak(KOTA), tanggalAcak(tahunLahir, tahunLahir), jk,
          alamatAcak(), noHpAcak(), tahunMasuk, now]
      )
      jumlahMurid++
      if ((i + 1) % 100 === 0) console.log(`  …${i + 1} murid`)
    }

    // ================= 2) PTK =================
    // Distribusi: mayoritas guru, beberapa staff sarpras & kaproli
    const split = (role, n) => ({ role, n })
    const distribusi = [
      split('guru', Math.max(0, JUMLAH_PTK - 8)),
      split('staff_sarpras', 6),
      split('kaproli', 2)
    ]
    // pastikan total = JUMLAH_PTK
    let totalDiRencana = distribusi.reduce((s, d) => s + d.n, 0)
    distribusi[0].n += JUMLAH_PTK - totalDiRencana

    console.log(`→ Generate ${JUMLAH_PTK} PTK (password default: ${PTK_PASSWORD})...`)
    const hashPtk = bcrypt.hashSync(PTK_PASSWORD, 10)
    let counterPtk = 1
    for (const { role, n } of distribusi) {
      for (let j = 0; j < n; j++) {
        const nama = namaLengkap()
        let email = `${slug(nama)}.${String(counterPtk).padStart(3, '0')}@${EMAIL_DOMAIN}`
        while (emailAda.has(email)) { counterPtk++; email = `${slug(nama)}.${String(counterPtk).padStart(3, '0')}@${EMAIL_DOMAIN}` }
        emailAda.add(email)

        let nip = `${angka(1965, 1995).toString()}${String(angka(1, 12)).padStart(2, '0')}${String(angka(1, 28)).padStart(2, '0')}${String(angka(100000, 999999))}${String(counterPtk).padStart(4, '0')}`
        while (nipAda.has(nip)) nip = `${Number(nip) + 1}`
        nipAda.add(nip)

        const nuptk = `${angka(1000000000, 9999999999)}${String(counterPtk).padStart(6, '0')}`
        const jk = Math.random() < 0.55 ? 'L' : 'P'

        const ures = await client.query(
          `INSERT INTO users (name, email, password, kelas, jurusan_id, nip, nuptk, tempat_lahir,
              tanggal_lahir, alamat, no_hp, jenis_kelamin, foto, is_active, failed_login_count,
              created_at, updated_at)
           VALUES ($1,$2,$3,NULL,NULL,$4,$5,$6,$7,$8,$9,$10,NULL,true,0,$11,$11) RETURNING id`,
          [nama, email, hashPtk, nip, nuptk, acak(KOTA), tanggalAcak(1970, 2000),
            alamatAcak(), noHpAcak(), jk, now]
        )
        const userId = ures.rows[0].id
        const roleIdN = roleId(role)
        await client.query(
          `INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES ($1, $2, $3)`,
          [roleIdN, modelType, userId]
        )
        // Simpan password plain (masa aktif 30 hari) — sama seperti storePlainPassword
        await client.query(
          `INSERT INTO akun_passwords (user_id, password, expires_at, created_at, updated_at)
           VALUES ($1, $2, now() + interval '30 days', $3, $3)`,
          [userId, PTK_PASSWORD, now]
        )
        jumlahPtk++
        if (contohPtk.length < 5) contohPtk.push({ nama, email, password: PTK_PASSWORD, role })
        counterPtk++
      }
    }

    // ================= 3) BARANG =================
    // Syarat: master data tersedia (kategori & ruangan)
    const elektronikId = kategoriRows.find((k) => k.nama === 'Elektronik')?.id
    const furniturId = kategoriRows.find((k) => k.nama === 'Furnitur')?.id
    const bangunanId = kategoriRows.find((k) => k.nama === 'Aset Bangunan')?.id
    const kondisiBaik = kondisiRows.find((k) => k.nama === 'Baik')?.id
    const kondisiRingan = kondisiRows.find((k) => k.nama === 'Rusak Ringan')?.id
    const kondisiBerat = kondisiRows.find((k) => k.nama === 'Rusak Berat')?.id
    const satuanId = (nama) => satuanRows.find((s) => s.nama === nama)?.id ?? null

    const randKategori = () => {
      const r = Math.random()
      return r < 0.55 ? elektronikId : r < 0.9 ? furniturId : bangunanId
    }
    const randStatus = () => {
      const r = Math.random()
      return r < 0.82 ? 'aktif' : r < 0.9 ? 'rusak' : r < 0.96 ? 'maintenance' : 'dipinjam'
    }
    const randKondisi = (status) => {
      if (status === 'rusak') return Math.random() < 0.3 ? kondisiRingan : kondisiBerat
      if (status === 'maintenance') return Math.random() < 0.7 ? kondisiRingan : kondisiBaik
      if (status === 'dipinjam') return Math.random() < 0.9 ? kondisiBaik : kondisiRingan
      const r = Math.random()
      return r < 0.85 ? kondisiBaik : r < 0.95 ? kondisiRingan : kondisiBerat
    }

    if (!elektronikId || !furniturId || !ruanganRows.length) {
      console.log('→ Lewati dummy barang: master kategori/ruangan belum lengkap.')
    } else {
      console.log(`→ Generate ${JUMLAH_BARANG} barang dummy...`)
      const nomorBarang = {}
      for (let i = 0; i < JUMLAH_BARANG; i++) {
        const kategoriIdN = randKategori()
        const ruangan = ruanganRows[angka(0, ruanganRows.length - 1)]

        let katalog, satuanIdN = null
        let ownerType = 'sarpras'
        let proliIdN = null
        let bisaDipinjam = true

        if (kategoriIdN === elektronikId) {
          katalog = KATALOG_ELEKTRONIK
          satuanIdN = satuanId('Unit')
          const lab = Object.entries(LAB_PROLI).find(([key]) => ruangan.nama.startsWith(key))
          if (lab) { ownerType = 'proli'; proliIdN = lab[1] }
        } else if (kategoriIdN === furniturId) {
          katalog = KATALOG_FURNITUR
          satuanIdN = satuanId('Buah')
        } else {
          katalog = KATALOG_BANGUNAN
          satuanIdN = null
          bisaDipinjam = false // aset bangunan tidak bisa dipinjam
        }

        const item = acak(katalog)
        if (SATUAN_KHUSUS[item]) satuanIdN = satuanId(SATUAN_KHUSUS[item])
        const kunci = `${ruangan.id}:${item}`
        nomorBarang[kunci] = (nomorBarang[kunci] || 0) + 1
        const nama = `${item} ${ruangan.nama} - ${String(nomorBarang[kunci]).padStart(2, '0')}`

        // Kode QR unik pola BRG-XXXXXXXX (8 karakter, tanpa I/O agar mudah dibaca)
        let kodeQr
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
        do {
          let s = ''
          for (let j = 0; j < 8; j++) s += chars[angka(0, chars.length - 1)]
          kodeQr = `BRG-${s}`
        } while (kodeQrAda.has(kodeQr))
        kodeQrAda.add(kodeQr)

        const status = randStatus()
        const kondisiIdN = kategoriIdN === bangunanId ? null : randKondisi(status)
        const sumberDanaIdN = kategoriIdN === bangunanId ? null : acak(sumberDanaRows).id
        const proliNama = proliIdN ? proliRows.find((p) => Number(p.id) === proliIdN)?.nama : null
        const deskripsi = proliNama
          ? `Aset praktik ${proliNama} (data dummy).`
          : kategoriIdN === bangunanId
            ? 'Aset bangunan sekolah (data dummy).'
            : 'Aset operasional sekolah (data dummy).'

        await client.query(
          `INSERT INTO barang (nama, kode_qr, owner_type, proli_id, kategori_id, ruangan_id,
              status, deskripsi, bisa_dipinjam, tahun_ajaran_id, satuan_id, kondisi_id,
              sumber_dana_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
          [nama, kodeQr, ownerType, proliIdN, kategoriIdN, Number(ruangan.id), status,
            deskripsi, bisaDipinjam, tahunAktifId, satuanIdN, kondisiIdN, sumberDanaIdN, now]
        )
        jumlahBarang++
        if ((i + 1) % 50 === 0) console.log(`  …${i + 1} barang`)
      }
    }

    await client.query('COMMIT')

    // --- Ringkasan ---
    const cMurid = (await client.query('SELECT count(*) n FROM murid')).rows[0].n
    const cUsers = (await client.query('SELECT count(*) n FROM users')).rows[0].n
    const cBarang = (await client.query('SELECT count(*) n FROM barang')).rows[0].n
    console.log('\n✔ SEED SELESAI!')
    console.log(`  Murid baru : ${jumlahMurid}  (total murid: ${cMurid})`)
    console.log(`  PTK baru   : ${jumlahPtk}  (total users: ${cUsers})`)
    console.log(`  Barang baru: ${jumlahBarang}  (total barang: ${cBarang})`)
    console.log('\n  Contoh akun PTK (email / password):')
    for (const c of contohPtk) console.log(`    ${c.role.padEnd(13)} ${c.email}  /  ${c.password}`)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('✘ GAGAL:', e.message)
  process.exit(1)
})
