<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\LaporanKerusakan;
use Illuminate\Http\Request;

class LaporanKerusakanController extends Controller
{
    public function index(Request $request)
    {
        return LaporanKerusakan::with(['barang', 'pelapor', 'assignedStaff', 'vendor'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    /**
     * Guru/Murid: Scan QR -> Isi Form -> Upload Foto -> Submit
     * Sistem membaca owner barang lalu masuk ke Admin Sarpras / Ketua Proli.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'barang_id' => ['required', 'exists:barang,id'],
            'deskripsi' => ['required', 'string'],
            'foto_url' => ['nullable', 'string'],
        ]);

        $barang = Barang::findOrFail($data['barang_id']);

        $laporan = LaporanKerusakan::create([
            ...$data,
            'pelapor_id' => $request->user()->id,
            'status' => 'menunggu',
        ]);

        $barang->update(['status' => 'rusak']);

        return response()->json($laporan->load('barang'), 201);
    }

    public function show(LaporanKerusakan $laporanKerusakan)
    {
        return $laporanKerusakan->load(['barang', 'pelapor', 'assignedStaff', 'vendor']);
    }

    public function update(Request $request, LaporanKerusakan $laporanKerusakan)
    {
        $data = $request->validate([
            'hasil_perbaikan_url' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:menunggu,diverifikasi,diperbaiki,selesai'],
        ]);

        $laporanKerusakan->update($data);

        return response()->json($laporanKerusakan);
    }

    /**
     * Admin: Verifikasi laporan -> Assign Staff atau Assign Vendor.
     */
    public function verifikasi(Request $request, $id)
    {
        $laporan = LaporanKerusakan::findOrFail($id);

        $data = $request->validate([
            'assigned_to' => ['nullable', 'exists:users,id'],
            'vendor_id' => ['nullable', 'exists:vendor,id'],
        ]);

        $laporan->update([
            ...$data,
            'status' => 'diverifikasi',
        ]);

        return response()->json($laporan);
    }

    public function destroy(LaporanKerusakan $laporanKerusakan)
    {
        $laporanKerusakan->delete();

        return response()->json(null, 204);
    }
}
