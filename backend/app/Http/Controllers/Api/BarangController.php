<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\Subkategori;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BarangController extends Controller
{
    public function index(Request $request)
    {
        return Barang::with(['proli', 'kategori', 'subkategori', 'ruangan'])
            ->when($request->owner_type, fn ($q, $v) => $q->where('owner_type', $v))
            ->when($request->proli_id, fn ($q, $v) => $q->where('proli_id', $v))
            ->when($request->subkategori_id, fn ($q, $v) => $q->where('subkategori_id', $v))
            ->when($request->search, function ($q, $v) {
                $q->where(fn ($qq) => $qq->where('nama', 'like', "%{$v}%")->orWhere('kode_qr', 'like', "%{$v}%"));
            })
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
            'subkategori',
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
            'subkategori_id' => ['nullable', 'exists:subkategori,id'],
            'ruangan_id' => ['nullable', 'exists:ruangan,id'],
        ]);

        // Subkategori harus milik proli yang sama dengan barang
        $this->ensureSubkategoriMatchesProli($data);

        // Generate kode unik untuk QR Code
        $data['kode_qr'] = 'BRG-'.strtoupper(Str::random(8));
        $data['status'] = 'aktif';

        $barang = Barang::create($data);

        return response()->json($barang, 201);
    }

    public function show(Barang $barang)
    {
        return $barang->load(['proli', 'kategori', 'subkategori', 'ruangan', 'laporanKerusakan', 'peminjaman']);
    }

    public function update(Request $request, Barang $barang)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'owner_type' => ['sometimes', 'in:sarpras,proli'],
            'proli_id' => ['nullable', 'exists:proli,id'],
            'kategori_id' => ['nullable', 'exists:kategori_barang,id'],
            'subkategori_id' => ['nullable', 'exists:subkategori,id'],
            'ruangan_id' => ['nullable', 'exists:ruangan,id'],
            'status' => ['sometimes', 'in:aktif,rusak,dipinjam,maintenance'],
        ]);

        // Subkategori harus milik proli yang sama dengan barang
        $this->ensureSubkategoriMatchesProli($data);

        $barang->update($data);

        return response()->json($barang);
    }

    public function destroy(Barang $barang)
    {
        $barang->delete();

        return response()->json(null, 204);
    }

    /** Pastikan subkategori yang dipilih benar-benar milik proli barang tsb. */
    private function ensureSubkategoriMatchesProli(array $data): void
    {
        $subId = $data['subkategori_id'] ?? null;
        $proliId = $data['proli_id'] ?? null;

        if (! $subId || ! $proliId) {
            return;
        }

        $sub = Subkategori::find($subId);
        if ($sub && (int) $sub->proli_id !== (int) $proliId) {
            abort(422, 'Subkategori tidak cocok dengan proli barang.');
        }
    }
}
