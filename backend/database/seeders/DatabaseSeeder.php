<?php

namespace Database\Seeders;

use App\Models\AkunPassword;
use App\Models\Barang;
use App\Models\Gedung;
use App\Models\Jurusan;
use App\Models\KategoriBarang;
use App\Models\Kelas;
use App\Models\LaporanKerusakan;
use App\Models\Maintenance;
use App\Models\Peminjaman;
use App\Models\Proli;
use App\Models\Ruangan;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        // ============ Master Data ============
        $jurusanList = ['RPL', 'TKJ', 'Multimedia', 'Akuntansi', 'TBSM', 'DKV'];
        $jurusan = [];
        foreach ($jurusanList as $i => $nama) {
            $jurusan[$nama] = Jurusan::firstOrCreate(['nama' => $nama]);
        }

        $proliData = [
            'RPL' => ['Rekayasa Perangkat Lunak'],
            'TKJ' => ['Teknik Komputer dan Jaringan'],
            'Multimedia' => ['Desain Komunikasi Visual'],
            'Akuntansi' => ['Akuntansi dan Keuangan Lembaga'],
            'TBSM' => ['Teknik dan Bisnis Sepeda Motor'],
            'DKV' => ['Desain Komunikasi Visual'],
        ];
        $proli = [];
        foreach ($proliData as $j => $names) {
            foreach ($names as $n) {
                $proli[$n] = Proli::firstOrCreate(['nama' => $n], ['jurusan_id' => $jurusan[$j]->id]);
            }
        }

        // Kelas sebagai sub-kategori jurusan (mis. RPL: X RPL 1, XI RPL 1, XII RPL 1)
        $tingkatList = ['X', 'XI', 'XII'];
        foreach ($jurusan as $jn => $j) {
            foreach ($tingkatList as $t) {
                Kelas::firstOrCreate(['nama' => $t.' '.$jn.' 1'], ['jurusan_id' => $j->id]);
            }
        }

        $gedungA = Gedung::firstOrCreate(['nama' => 'Gedung A']);
        $gedungB = Gedung::firstOrCreate(['nama' => 'Gedung B']);

        $ruanganNama = [
            'Ruang Guru', 'Lab RPL 1', 'Lab RPL 2', 'Lab TKJ', 'Lab Multimedia',
            'Ruang Kelas X', 'Ruang Kelas XI', 'Ruang Kelas XII', 'Perpustakaan',
            'Lab Akuntansi', 'Bengkel TBSM', 'Ruang Server', 'Aula', 'Gudang Sarpras'
        ];
        $ruangan = [];
        foreach ($ruanganNama as $i => $rn) {
            $ruangan[$rn] = Ruangan::firstOrCreate(['nama' => $rn], ['gedung_id' => $i % 2 === 0 ? $gedungA->id : $gedungB->id]);
        }

        $kategoriNama = ['Proyektor', 'Laptop', 'Komputer', 'AC', 'Meja', 'Kursi', 'Papan Tulis', 'Alat Praktik', 'Sound System', 'Internet'];
        $kategori = [];
        foreach ($kategoriNama as $kn) {
            $kategori[$kn] = KategoriBarang::firstOrCreate(['nama' => $kn]);
        }

        $vendorList = [
            ['PT Teknologi Maju', '0812-3456-7890', 'Jl. Merdeka No. 1', 'Vendor IT & jaringan'],
            ['CV Sinar Jaya', '0813-2222-1111', 'Jl. Sudirman No. 45', 'Vendor elektronik & AC'],
            ['PT Furniture Nusantara', '0821-9999-8888', 'Jl. Ahmad Yani No. 12', 'Vendor meubel'],
            ['Bengkel Sentral Motor', '0857-7777-6666', 'Jl. Pemuda No. 88', 'Servis kendaraan & alat praktik'],
            ['CV Multimedia Kreatif', '0838-5555-4444', 'Jl. Gajah Mada No. 20', 'Vendor multimedia & sound'],
        ];
        $vendors = [];
        foreach ($vendorList as $v) {
            $vendors[] = Vendor::firstOrCreate(['nama' => $v[0]], [
                'kontak' => $v[1],
                'alamat' => $v[2],
                'keterangan' => $v[3],
            ]);
        }

        // ============ Users per Role ============
        $admin = User::factory()->create([
            'name' => 'Admin Sarpras',
            'email' => 'admin@example.com',
        ]);
        $admin->assignRole('admin');

        $kepsek = User::factory()->create([
            'name' => 'Dr. Hj. Siti Rahmawati, M.Pd',
            'email' => 'kepsek@example.com',
        ]);
        $kepsek->assignRole('kepsek');

        // Staff sarpras
        $staffNama = ['Bambang Sutrisno', 'Rina Kusuma', 'Joko Prasetyo'];
        $staff = [];
        foreach ($staffNama as $i => $sn) {
            $u = User::factory()->create([
                'name' => $sn,
                'email' => 'staff'.($i + 1).'@example.com',
            ]);
            $u->assignRole('staff_sarpras');
            $staff[] = $u;
        }

        // Ketua proli
        $kaproliNama = [
            'Rekayasa Perangkat Lunak' => 'Dian Puspita, S.Kom',
            'Teknik Komputer dan Jaringan' => 'Agus Setiawan, S.T',
            'Desain Komunikasi Visual' => 'Maya Anggraini, S.Ds',
            'Akuntansi dan Keuangan Lembaga' => 'Sri Wahyuni, S.E',
            'Teknik dan Bisnis Sepeda Motor' => 'Hendra Gunawan, S.T',
        ];
        $kaproli = [];
        foreach ($proli as $pn => $p) {
            $kapNama = $kaproliNama[$pn] ?? ('Ketua '.$pn);
            $u = User::factory()->create(['name' => $kapNama, 'email' => Str::slug($pn).'.kaproli@example.com']);
            $u->assignRole('kaproli');
            $kaproli[] = $u;
            $p->update(['ketua_proli_id' => $u->id]);
        }

        // Guru per jurusan
        $guruNama = [
            'RPL' => ['Andi Firmansyah', 'Budi Hartono', 'Citra Lestari'],
            'TKJ' => ['Dedi Kurniawan', 'Eka Safitri'],
            'Multimedia' => ['Fajar Ramadhan', 'Gita Permata'],
            'Akuntansi' => ['Hadi Susanto', 'Indah Purnamasari'],
            'TBSM' => ['Joko Wibowo', 'Kartika Sari'],
            'DKV' => ['Lukman Hakim', 'Mega Utami'],
        ];
        $gurus = [];
        foreach ($guruNama as $j => $names) {
            foreach ($names as $gn) {
                $u = User::factory()->create([
                    'name' => $gn,
                    'email' => Str::slug($gn).'@guru.example.com',
                    'jurusan_id' => $jurusan[$j]->id,
                ]);
                $u->assignRole('guru');
                $gurus[] = $u;
            }
        }

        // Murid dipisah per kelas & jurusan
        $kelasList = ['X', 'XI', 'XII'];
        $namaMurid = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Iqbal', 'Jasmine', 'Kevin', 'Laila', 'Miftah', 'Nadia', 'Oscar', 'Putri', 'Qori', 'Rizky', 'Salsa', 'Tegar', 'Umar', 'Vina', 'Wahyu', 'Yusuf'];
        $murids = [];
        foreach ($jurusan as $jn => $j) {
            foreach ($kelasList as $k) {
                $count = 4;
                for ($i = 1; $i <= $count; $i++) {
                    $nama = $namaMurid[array_rand($namaMurid)].' '.$k.' '.$jn.'-'.$i;
                    $u = User::factory()->create([
                        'name' => $nama,
                        'email' => strtolower($jn).'.'.$k.'.'.$i.'@murid.example.com',
                        'kelas' => $k.' '.$jn.' '.$i,
                        'jurusan_id' => $j->id,
                    ]);
                    $u->assignRole('murid');
                    $murids[] = $u;
                }
            }
        }

        // ============ Barang ============
        $barangDef = [
            ['Proyektor Epson EB-X05', 'sarpras', null, 'Proyektor', 'Gudang Sarpras'],
            ['Proyektor ViewSonic PA503S', 'sarpras', null, 'Proyektor', 'Gudang Sarpras'],
            ['Laptop ASUS Vivobook 15', 'proli', 'Rekayasa Perangkat Lunak', 'Laptop', 'Lab RPL 1'],
            ['Laptop HP ProBook 440', 'proli', 'Rekayasa Perangkat Lunak', 'Laptop', 'Lab RPL 2'],
            ['Laptop Lenovo ThinkPad', 'proli', 'Teknik Komputer dan Jaringan', 'Laptop', 'Lab TKJ'],
            ['PC Desktop i5 RAM 16GB', 'proli', 'Rekayasa Perangkat Lunak', 'Komputer', 'Lab RPL 1'],
            ['PC Desktop i3 RAM 8GB', 'proli', 'Teknik Komputer dan Jaringan', 'Komputer', 'Lab TKJ'],
            ['iMac 24"', 'proli', 'Desain Komunikasi Visual', 'Komputer', 'Lab Multimedia'],
            ['AC Split 1 PK', 'sarpras', null, 'AC', 'Ruang Guru'],
            ['AC Standing 2 PK', 'sarpras', null, 'AC', 'Aula'],
            ['Meja Siswa', 'sarpras', null, 'Meja', 'Ruang Kelas X'],
            ['Meja Guru', 'sarpras', null, 'Meja', 'Ruang Guru'],
            ['Kursi Siswa', 'sarpras', null, 'Kursi', 'Ruang Kelas X'],
            ['Kursi Lipat', 'sarpras', null, 'Kursi', 'Aula'],
            ['Papan Tulis Whiteboard', 'sarpras', null, 'Papan Tulis', 'Ruang Kelas XI'],
            ['Toolkit Mekanik 120 pcs', 'proli', 'Teknik dan Bisnis Sepeda Motor', 'Alat Praktik', 'Bengkel TBSM'],
            ['Mesin Bubut Mini', 'proli', 'Teknik dan Bisnis Sepeda Motor', 'Alat Praktik', 'Bengkel TBSM'],
            ['Oscilloscope Digital', 'proli', 'Teknik Komputer dan Jaringan', 'Alat Praktik', 'Lab TKJ'],
            ['Sound System Portable', 'sarpras', null, 'Sound System', 'Aula'],
            ['Mikrofon Wireless', 'sarpras', null, 'Sound System', 'Aula'],
            ['Router Cisco 2900', 'proli', 'Teknik Komputer dan Jaringan', 'Internet', 'Ruang Server'],
            ['Switch 24 Port', 'proli', 'Teknik Komputer dan Jaringan', 'Internet', 'Ruang Server'],
            ['Kamula DSLR Canon 80D', 'proli', 'Desain Komunikasi Visual', 'Alat Praktik', 'Lab Multimedia'],
            ['Mesin Kasir', 'proli', 'Akuntansi dan Keuangan Lembaga', 'Komputer', 'Lab Akuntansi'],
            ['Kalkulator Ilmiah', 'proli', 'Akuntansi dan Keuangan Lembaga', 'Alat Praktik', 'Lab Akuntansi'],
            ['Printer Epson L3210', 'sarpras', null, 'Komputer', 'Ruang Guru'],
            ['Tv LED 50"', 'sarpras', null, 'Sound System', 'Aula'],
            ['Camera CCTV 4MP', 'sarpras', null, 'Alat Praktik', 'Ruang Server'],
        ];

        $barangs = [];
        $deskripsiBarang = [
            'Proyektor Epson EB-X05' => 'Proyektor LCD 3LCD 3600 lumen untuk presentasi dan media pembelajaran. Dilengkapi port HDMI dan VGA, cocok untuk ruang kelas dan aula.',
            'Proyektor ViewSonic PA503S' => 'Proyektor SVGA 3600 lumen dengan lampu tahan lama (hingga 15.000 jam), untuk tampilan presentasi di ruang kelas.',
            'Laptop ASUS Vivobook 15' => 'Laptop 15.6 inci, prosesor Intel Core i5, RAM 8GB, SSD 512GB. Digunakan untuk praktik pemrograman dan tugas siswa.',
            'Laptop HP ProBook 440' => 'Laptop bisnis 14 inci, Intel Core i5 generasi terbaru, RAM 8GB, SSD 256GB. Dilengkapi port lengkap untuk kebutuhan praktik.',
            'Laptop Lenovo ThinkPad' => 'Laptop andal 14 inci, Intel Core i5, RAM 8GB, SSD 256GB. Tahan banting, cocok untuk praktik jaringan.',
            'PC Desktop i5 RAM 16GB' => 'Unit PC desktop dengan prosesor Intel Core i5, RAM 16GB, SSD 512GB. Digunakan di lab RPL untuk pengembangan aplikasi.',
            'PC Desktop i3 RAM 8GB' => 'Unit PC desktop Intel Core i3, RAM 8GB, HDD 1TB. Digunakan untuk praktik konfigurasi jaringan di lab TKJ.',
            'iMac 24"' => 'Komputer all-in-one Apple dengan layar Retina 24 inci. Digunakan untuk praktik desain grafis dan multimedia.',
            'AC Split 1 PK' => 'Pendingin ruangan tipe split kapasitas 1 PK untuk ruang guru dan ruang kelas. Wajib servis berkala setiap 3 bulan.',
            'AC Standing 2 PK' => 'Pendingin ruangan tipe standing/floor kapasitas 2 PK untuk aula, dengan remote control dan mode hemat energi.',
            'Meja Siswa' => 'Meja belajar siswa berbahan kayu lapis dengan rangka besi, ukuran 60x40 cm. Tersedia di ruang kelas X.',
            'Meja Guru' => 'Meja kerja guru berukuran besar dengan laci penyimpanan, berbahan kayu solid dan finishing cat.',
            'Kursi Siswa' => 'Kursi belajar siswa dengan rangka besi dan dudukan kayu, kokoh dan ringan untuk dipindahkan.',
            'Kursi Lipat' => 'Kursi lipat portable untuk kegiatan aula dan acara sekolah. Mudah disimpan dan ditata ulang.',
            'Papan Tulis Whiteboard' => 'Papan tulis whiteboard ukuran 120x240 cm dengan magnet, dilengkapi rak spidol dan penghapus.',
            'Toolkit Mekanik 120 pcs' => 'Set peralatan mekanik lengkap 120 pcs untuk praktik bengkel sepeda motor: kunci sok, obeng, tang, dan lainnya.',
            'Mesin Bubut Mini' => 'Mesin bubut mini untuk praktik pemesinan dasar, cocok untuk mata pelajaran produktif TBSM.',
            'Oscilloscope Digital' => 'Osiloskop digital 100MHz untuk pengukuran sinyal elektronika pada praktik TKJ dan elektronika dasar.',
            'Sound System Portable' => 'Speaker aktif portable 15 inci dengan microphone wireless, untuk acara di aula dan lapangan.',
            'Mikrofon Wireless' => 'Mikrofon nirkabel UHF dengan receiver, untuk kebutuhan pidato dan kegiatan sekolah.',
            'Router Cisco 2900' => 'Router enterprise Cisco ISR 2900 untuk praktik routing dan konfigurasi jaringan tingkat lanjut.',
            'Switch 24 Port' => 'Switch managed 24 port Gigabit untuk praktik jaringan dan pembagian koneksi di ruang server.',
            'Kamula DSLR Canon 80D' => 'Kamera DSLR Canon EOS 80D dengan lensa kit 18-135mm, untuk praktik fotografi dan videografi.',
            'Mesin Kasir' => 'Mesin kasir/point of sale untuk praktik akuntansi keuangan dan transaksi lembaga.',
            'Kalkulator Ilmiah' => 'Kalkulator ilmiah untuk praktik hitung akuntansi dan keuangan, mudah dibawa dan digunakan.',
            'Printer Epson L3210' => 'Printer inkjet multifungsi dengan sistem tinta botol (ecotank), hemat biaya untuk kebutuhan administrasi.',
            'Tv LED 50"' => 'Televisi LED 50 inci Full HD untuk media pembelajaran, presentasi, dan tayangan edukasi di aula.',
            'Camera CCTV 4MP' => 'Kamera CCTV 4MP dengan night vision dan penyimpanan cloud, untuk monitoring keamanan ruang server.',
        ];
        foreach ($barangDef as $i => [$nama, $owner, $proliName, $kategoriName, $ruanganName]) {
            $barangs[] = Barang::firstOrCreate(['nama' => $nama], [
                'deskripsi' => $deskripsiBarang[$nama] ?? null,
                'kode_qr' => 'BRG-'.strtoupper(Str::random(8)),
                'owner_type' => $owner,
                'proli_id' => $proliName ? $proli[$proliName]->id : null,
                'kategori_id' => $kategori[$kategoriName]->id,
                'ruangan_id' => $ruangan[$ruanganName]->id,
                'status' => 'aktif',
            ]);
        }

        // ============ Peminjaman (dengan jam pelajaran) ============
        $statusLoop = ['menunggu', 'disetujui', 'dipinjam', 'dikembalikan', 'ditolak', 'dikembalikan', 'menunggu'];
        $peminjamPool = collect($gurus)->merge($murids)->all();
        for ($i = 0; $i < 30; $i++) {
            $barang = $barangs[array_rand($barangs)];
            $jamMulai = rand(1, 9);
            $jamSelesai = min($jamMulai + rand(1, 3), 12);
            $status = $statusLoop[array_rand($statusLoop)];
            Peminjaman::create([
                'barang_id' => $barang->id,
                'peminjam_id' => $peminjamPool[array_rand($peminjamPool)]->id,
                'status' => $status,
                'tanggal_pinjam' => now()->subDays(rand(0, 20))->format('Y-m-d'),
                'jam_mulai' => $jamMulai,
                'jam_selesai' => $jamSelesai,
                'foto_pinjam' => null,
                'foto_kembali' => null,
                'disetujui_oleh' => in_array($status, ['disetujui', 'dipinjam', 'dikembalikan']) ? $admin->id : null,
            ]);
        }

        // ============ Laporan Kerusakan ============
        $deskripsi = [
            'Proyektor tidak menyala saat digunakan.',
            'Layar laptop muncul garis-garis.',
            'Keyboard beberapa tombol tidak berfungsi.',
            'AC tidak dingin / tidak mengeluarkan udara.',
            'Meja goyang dan kaki meja patah.',
            'Kursi roda patah.',
            'Speaker berdengung saat dinyalakan.',
            'Monitor komputer berkedip-kedip.',
        ];
        $laporStatus = ['menunggu', 'diverifikasi', 'diperbaiki', 'selesai'];
        for ($i = 0; $i < 15; $i++) {
            $barang = $barangs[array_rand($barangs)];
            LaporanKerusakan::create([
                'barang_id' => $barang->id,
                'pelapor_id' => $peminjamPool[array_rand($peminjamPool)]->id,
                'deskripsi' => $deskripsi[array_rand($deskripsi)],
                'foto_url' => null,
                'status' => $laporStatus[array_rand($laporStatus)],
                'assigned_to' => rand(0, 1) ? $staff[array_rand($staff)]->id : null,
                'vendor_id' => rand(0, 1) ? $vendors[array_rand($vendors)]->id : null,
                'hasil_perbaikan_url' => null,
            ]);
        }

        // ============ Maintenance ============
        $maintStatus = ['terjadwal', 'berlangsung', 'selesai'];
        for ($i = 0; $i < 12; $i++) {
            $barang = $barangs[array_rand($barangs)];
            Maintenance::create([
                'barang_id' => $barang->id,
                'tanggal_jadwal' => now()->subDays(rand(-10, 20))->format('Y-m-d'),
                'staff_id' => rand(0, 1) ? $staff[array_rand($staff)]->id : null,
                'vendor_id' => rand(0, 1) ? $vendors[array_rand($vendors)]->id : null,
                'status' => $maintStatus[array_rand($maintStatus)],
                'dokumentasi_url' => null,
                'catatan' => 'Perawatan berkala '.$barang->nama,
            ]);
        }

        // ============ Password plaintext (fitur "Lihat Password" admin) ============
        // Semua akun seeding memakai password default factory ('password'); simpan
        // salinan plaintext-nya ke tabel khusus admin agar tombol "Lihat Password"
        // langsung berfungsi untuk akun yang sudah ada tanpa harus reset dulu.
        foreach (User::all() as $u) {
            if (! AkunPassword::where('user_id', $u->id)->exists()) {
                AkunPassword::create([
                    'user_id' => $u->id,
                    'password' => 'password',
                    'expires_at' => now()->addDays(30),
                ]);
            }
        }
    }
}
