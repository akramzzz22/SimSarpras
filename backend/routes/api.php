<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\GedungController;
use App\Http\Controllers\Api\JurusanController;
use App\Http\Controllers\Api\KelasController;
use App\Http\Controllers\Api\KategoriBarangController;
use App\Http\Controllers\Api\LaporanKerusakanController;
use App\Http\Controllers\Api\PeminjamanController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\MuridController;
use App\Http\Controllers\Api\ProliController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\RuanganController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorController;

// Auth
Route::post('/login', [AuthController::class, 'login']);

// Public: info barang saat QR di-scan (tanpa login)
Route::get('/barang/by-kode/{kode}', [BarangController::class, 'byKode']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Asset / Barang (Admin: tambah barang, pilih owner, generate QR)
    Route::apiResource('barang', BarangController::class);

    // Lapor Kerusakan (Guru/Murid scan QR -> isi form -> upload foto)
    Route::apiResource('laporan-kerusakan', LaporanKerusakanController::class);
    Route::post('laporan-kerusakan/{id}/verifikasi', [LaporanKerusakanController::class, 'verifikasi']);

    // Peminjaman (Approval oleh Admin Sarpras / Ketua Proli tergantung owner barang)
    Route::apiResource('peminjaman', PeminjamanController::class);
    Route::post('peminjaman/{id}/approve', [PeminjamanController::class, 'approve']);
    Route::post('peminjaman/{id}/reject', [PeminjamanController::class, 'reject']);
    Route::post('peminjaman/{id}/kembalikan', [PeminjamanController::class, 'kembalikan']);

    // Maintenance Berkala
    Route::apiResource('maintenance', MaintenanceController::class);

    // Vendor
    Route::apiResource('vendor', VendorController::class);

    // Master Data
    Route::apiResource('gedung', GedungController::class);
    Route::apiResource('jurusan', JurusanController::class);
    Route::apiResource('kelas', KelasController::class);
    Route::apiResource('proli', ProliController::class);
    Route::apiResource('ruangan', RuanganController::class);
    Route::apiResource('kategori-barang', KategoriBarangController::class);
    Route::apiResource('murid', MuridController::class);
    Route::apiResource('users', UserController::class);
    // Fitur akun (generate/lihat/reset password) — dipakai di halaman Pengaturan Akun
    Route::post('users/{user}/generate-akun', [UserController::class, 'generateAkun']);
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::get('users/{user}/lihat-password', [UserController::class, 'lihatPassword']);

    // Role Management
    Route::get('roles', [RoleController::class, 'index']);
    Route::post('roles', [RoleController::class, 'store']);
    Route::delete('roles/{role}', [RoleController::class, 'destroy']);
});
