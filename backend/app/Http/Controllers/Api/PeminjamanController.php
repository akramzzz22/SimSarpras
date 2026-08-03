<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\Peminjaman;
use Illuminate\Http\Request;

class PeminjamanController extends Controller
{
    /** Jumlah jam pelajaran maksimal dalam sehari (jam ke-1 s/d ke-12). */
    public const MAX_JAM = 12;

    public function index(Request $request)
    {
        return Peminjaman::with(['barang', 'peminjam', 'penyetuju'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    /**
     * Guru/Murid: Ajukan Peminjaman.
     * Wajib upload foto barang, pilih tanggal + rentang jam pelajaran (jam ke berapa s/d ke berapa).
     * Barang Sarpras -> disetujui Admin Sarpras. Barang Proli -> disetujui Ketua Proli.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'barang_id' => ['required', 'exists:barang,id'],
            'tanggal_pinjam' => ['required', 'date'],
            'jam_mulai' => ['required', 'integer', 'min:1', 'max:'.self::MAX_JAM],
            'jam_selesai' => ['required', 'integer', 'min:1', 'max:'.self::MAX_JAM, 'gte:jam_mulai'],
            'foto_pinjam' => ['required', 'string'],
        ]);

        // Cek bentrok jadwal: barang yang sama, tanggal sama, rentang jam tumpang tindih,
        // dan statusnya masih aktif (menunggu / disetujui / dipinjam).
        $bentrok = Peminjaman::where('barang_id', $data['barang_id'])
            ->where('tanggal_pinjam', $data['tanggal_pinjam'])
            ->whereIn('status', ['menunggu', 'disetujui', 'dipinjam'])
            ->where(function ($q) use ($data) {
                // Tumpang tindih: mulai_lain < selesai_baru && selesai_lain > mulai_baru
                $q->where('jam_mulai', '<', $data['jam_selesai'])
                    ->where('jam_selesai', '>', $data['jam_mulai']);
            })
            ->exists();

        if ($bentrok) {
            return response()->json([
                'message' => 'Barang sudah dipinjam pada tanggal & jam tersebut. Pilih jadwal lain.',
            ], 422);
        }

        $peminjaman = Peminjaman::create([
            ...$data,
            'peminjam_id' => $request->user()->id,
            'status' => 'menunggu',
        ]);

        return response()->json($peminjaman->load('barang'), 201);
    }

    public function show(Peminjaman $peminjaman)
    {
        return $peminjaman->load(['barang', 'peminjam', 'penyetuju']);
    }

    public function approve(Request $request, $id)
    {
        $peminjaman = Peminjaman::findOrFail($id);

        // Cek ulang bentrok saat menyetujui (mencegah dua pengajuan menunggu disetujui keduanya).
        $bentrok = Peminjaman::where('barang_id', $peminjaman->barang_id)
            ->where('tanggal_pinjam', $peminjaman->tanggal_pinjam)
            ->where('id', '!=', $peminjaman->id)
            ->whereIn('status', ['menunggu', 'disetujui', 'dipinjam'])
            ->where(function ($q) use ($peminjaman) {
                $q->where('jam_mulai', '<', $peminjaman->jam_selesai)
                    ->where('jam_selesai', '>', $peminjaman->jam_mulai);
            })
            ->exists();

        if ($bentrok) {
            return response()->json([
                'message' => 'Jadwal bentrok dengan peminjaman lain pada barang yang sama.',
            ], 422);
        }

        $peminjaman->update([
            'status' => 'disetujui',
            'disetujui_oleh' => $request->user()->id,
        ]);

        $peminjaman->barang()->update(['status' => 'dipinjam']);

        return response()->json($peminjaman);
    }

    public function reject(Request $request, $id)
    {
        $peminjaman = Peminjaman::findOrFail($id);

        $peminjaman->update([
            'status' => 'ditolak',
            'disetujui_oleh' => $request->user()->id,
        ]);

        return response()->json($peminjaman);
    }

    public function kembalikan(Request $request, $id)
    {
        $peminjaman = Peminjaman::findOrFail($id);

        // Wajib upload foto barang saat pengembalian.
        $data = $request->validate([
            'foto_kembali' => ['required', 'string'],
        ]);

        $peminjaman->update([
            'status' => 'dikembalikan',
            'foto_kembali' => $data['foto_kembali'],
        ]);

        $peminjaman->barang()->update(['status' => 'aktif']);

        return response()->json($peminjaman);
    }

    public function destroy(Peminjaman $peminjaman)
    {
        $peminjaman->delete();

        return response()->json(null, 204);
    }
}
