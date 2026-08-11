// ============================================================
// Identitas sekolah untuk kop surat peminjaman barang.
// Data: SMK Negeri 4 Bandung
// ============================================================
export const sekolah = {
  // Nama aplikasi yang tampil di header (gaya "Aplikasi Skoria")
  namaAplikasi: 'Aplikasi Sarpras',
  // Teks promosi / pengumuman di top bar (bisa di-hide oleh pengguna).
  // Kosongkan ('') agar bar promosi tidak menampilkan apa pun.
  pengumuman: 'Selamat datang di Aplikasi Sarpras SMKN 4 Bandung — kelola aset, peminjaman, dan maintenance sekolah dengan mudah.',
  // Mode pemeliharaan: true → aplikasi menampilkan banner peringatan (dikelola
  // lewat Pengaturan → Pengaturan Sistem).
  modePemeliharaan: false,
  nama: 'SMK NEGERI 4 BANDUNG',
  // Alamat ditampilkan di bawah nama sekolah (kop surat)
  alamat: 'Jl. Kliningan No. 6, Kel. Turangga, Kec. Lengkong, Kota Bandung, Jawa Barat',
  kodePos: '40264',
  telepon: '(022) 7303736',
  npsn: '20219144',
  // Kode singkatan untuk nomor surat (mis. SPB/001/SMKN4/2026)
  kodeSurat: 'SMKN4',
  // Penanggung jawab sarana prasarana (untuk kolom "Mengetahui")
  pjSarpras: 'Kepala Sarana dan Prasarana SMKN 4 Bandung',
  // ============================================================
  // FOTO untuk header (bukan ikon logo) — isi path file yang ditaruh di
  // folder frontend/public, mis. '/images/pemprov.png'.
  // Kosongkan ('' ) → tampil fallback lingkaran ber-inisial.
  // ============================================================
  // Foto ikon aplikasi (kiri header)
  // Logo custom Aplikasi Sarpras — varian lain: /images/logo-sarpras-gear.svg, /images/logo-sarpras-s.svg
  fotoAplikasi: '/images/logo-sarpras.svg',
  // Tiga foto instansi (kanan header): Pemprov, Dinas Pendidikan (Cadisdik VII), Sekolah
  // logodinas.png sebenarnya logo Pemprov Jabar (perisai 'Gemah Ripah Repeh Rapih')
  fotoPemprov: '/images/logodinas.png',
  // Logo resmi Cabang Dinas Pendidikan Wilayah VII (dari akun resmi @cadisdik7)
  fotoDinas: '/images/cadisdik7.jpg',
  fotoSekolah: '/images/smkn4.png',
  // ============================================================
  // PATTERN HEADER (opsional) — gambar yang diulang sebagai tekstur
  // dekoratif di header admin & staff. Kosongkan ('') → pakai garis
  // diagonal halus bawaan dari CSS. Isi path file di folder public
  // (mis. '/images/pattern-batik.png') atau URL hasil upload.
  // ============================================================
  patternHeader: ''
}
