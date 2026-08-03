<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        return Maintenance::with(['barang', 'staff', 'vendor'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    /**
     * Admin: Buat Jadwal Maintenance Berkala -> Notifikasi Staff.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'barang_id' => ['required', 'exists:barang,id'],
            'tanggal_jadwal' => ['required', 'date'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'vendor_id' => ['nullable', 'exists:vendor,id'],
            'catatan' => ['nullable', 'string'],
        ]);

        $maintenance = Maintenance::create([
            ...$data,
            'status' => 'terjadwal',
        ]);

        // TODO: kirim notifikasi ke staff yang ditugaskan
        // $maintenance->staff?->notify(new MaintenanceScheduled($maintenance));

        return response()->json($maintenance, 201);
    }

    public function show(Maintenance $maintenance)
    {
        return $maintenance->load(['barang', 'staff', 'vendor']);
    }

    /**
     * Admin: Edit jadwal / Staff: Upload Dokumentasi + ubah status.
     */
    public function update(Request $request, Maintenance $maintenance)
    {
        $data = $request->validate([
            'barang_id' => ['sometimes', 'exists:barang,id'],
            'tanggal_jadwal' => ['sometimes', 'date'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'vendor_id' => ['nullable', 'exists:vendor,id'],
            'catatan' => ['nullable', 'string'],
            'dokumentasi_url' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:terjadwal,berlangsung,selesai'],
        ]);

        $maintenance->update($data);

        return response()->json($maintenance->load(['barang', 'staff', 'vendor']));
    }

    public function destroy(Maintenance $maintenance)
    {
        $maintenance->delete();

        return response()->json(null, 204);
    }
}
