<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BarangController extends Controller
{
    public function index(Request $request)
    {
        return Barang::with(['proli', 'kategori', 'ruangan'])
            ->when($request->owner_type, fn ($q, $v) => $q->where('owner_type', $v))
            ->when($request->proli_id, fn ($q, $v) => $q->where('proli_id', $v))
            ->paginate($request->integer('per_page', 15));
    }

    /**
     * Cari barang berdasarkan kode QR (publik, tanpa login).
     * Dipakai oleh halaman info publik saat QR di-scan dari kamera HP.
     */
    public function byKode(string $kode)
    {
        $barang = Barang::with([
            'proli',
            'kategori',
            'ruangan.gedung',
            'laporanKerusakan' => fn ($q) => $q->with('pelapor')->latest(),
            'peminjaman' => fn ($q) => $q->with('peminjam')->latest(),
        ])
            ->where('kode_qr', $kode)
            ->first();

        if (! $barang) {
            return response()->json(['message' => 'Barang tidak ditemukan.'], 404);
        }

        return response()->json($barang);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'owner_type' => ['required', 'in:sarpras,proli'],
            'proli_id' => ['nullable', 'exists:proli,id'],
            'kategori_id' => ['nullable', 'exists:kategori_barang,id'],
            'ruangan_id' => ['nullable', 'exists:ruangan,id'],
        ]);

        // Generate kode unik untuk QR Code
        $data['kode_qr'] = 'BRG-'.strtoupper(Str::random(8));
        $data['status'] = 'aktif';

        $barang = Barang::create($data);

        return response()->json($barang, 201);
    }

    public function show(Barang $barang)
    {
        return $barang->load(['proli', 'kategori', 'ruangan', 'laporanKerusakan', 'peminjaman']);
    }

    public function update(Request $request, Barang $barang)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'owner_type' => ['sometimes', 'in:sarpras,proli'],
            'proli_id' => ['nullable', 'exists:proli,id'],
            'kategori_id' => ['nullable', 'exists:kategori_barang,id'],
            'ruangan_id' => ['nullable', 'exists:ruangan,id'],
            'status' => ['sometimes', 'in:aktif,rusak,dipinjam,maintenance'],
        ]);

        $barang->update($data);

        return response()->json($barang);
    }

    public function destroy(Barang $barang)
    {
        $barang->delete();

        return response()->json(null, 204);
    }
}
