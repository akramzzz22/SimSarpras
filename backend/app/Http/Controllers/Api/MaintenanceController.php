<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use App\Notifications\MaintenanceScheduled;
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
     * Wajib pilih salah satu penanggung jawab: staff ATAU vendor.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'barang_id' => ['required', 'exists:barang,id'],
            'tanggal_jadwal' => ['required', 'date'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'vendor_id' => ['nullable', 'exists:vendor,id'],
            'catatan' => ['nullable', 'string'],
            'biaya' => ['nullable', 'numeric', 'min:0'],
            'resi_url' => ['nullable', 'string'],
        ]);

        // Pilih salah satu: staff ATAU vendor (tidak boleh keduanya / kosong)
        if ($invalid = $this->validatePenanggungJawab($data)) {
            return response()->json(['message' => $invalid], 422);
        }

        // Jika ada biaya pengeluaran, foto resi wajib diunggah.
        if ((float) ($data['biaya'] ?? 0) > 0 && blank($data['resi_url'] ?? null)) {
            return response()->json([
                'message' => 'Foto resi wajib diunggah jika ada biaya pengeluaran.',
                'errors' => ['resi_url' => ['Foto resi wajib diunggah jika ada biaya pengeluaran.']],
            ], 422);
        }

        $maintenance = Maintenance::create([
            ...$data,
            'status' => 'terjadwal',
        ]);

        // Kirim notifikasi ke staff yang ditugaskan
        if ($maintenance->staff_id && $maintenance->staff) {
            $maintenance->staff->notify(new MaintenanceScheduled($maintenance));
        }

        return response()->json($maintenance->load(['barang', 'staff', 'vendor']), 201);
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
            'biaya' => ['nullable', 'numeric', 'min:0'],
            'resi_url' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:terjadwal,berlangsung,selesai'],
        ]);

        // Validasi penanggung jawab hanya jika field-nya ikut dikirim (mis. edit jadwal).
        if (array_key_exists('staff_id', $data) || array_key_exists('vendor_id', $data)) {
            $check = [
                'staff_id' => $data['staff_id'] ?? $maintenance->staff_id,
                'vendor_id' => $data['vendor_id'] ?? $maintenance->vendor_id,
            ];
            if ($invalid = $this->validatePenanggungJawab($check)) {
                return response()->json(['message' => $invalid], 422);
            }
        }

        // Jika ada biaya pengeluaran, foto resi wajib diunggah.
        // Gunakan nilai lama bila field tidak dikirim (mendukung partial update).
        $biaya = array_key_exists('biaya', $data) ? $data['biaya'] : $maintenance->biaya;
        $resi = array_key_exists('resi_url', $data) ? $data['resi_url'] : $maintenance->resi_url;
        if ((float) ($biaya ?? 0) > 0 && blank($resi)) {
            return response()->json([
                'message' => 'Foto resi wajib diunggah jika ada biaya pengeluaran.',
                'errors' => ['resi_url' => ['Foto resi wajib diunggah jika ada biaya pengeluaran.']],
            ], 422);
        }

        $maintenance->update($data);

        return response()->json($maintenance->load(['barang', 'staff', 'vendor']));
    }

    public function destroy(Maintenance $maintenance)
    {
        $maintenance->delete();

        return response()->json(null, 204);
    }

    /**
     * Pastikan penanggung jawab maintenance dipilih SALAH SATU saja: staff atau vendor.
     * Mengembalikan pesan error bila tidak valid, atau null bila valid.
     */
    private function validatePenanggungJawab(array $data): ?string
    {
        $staff = $data['staff_id'] ?? null;
        $vendor = $data['vendor_id'] ?? null;

        if (filled($staff) && filled($vendor)) {
            return 'Pilih salah satu penanggung jawab: staff ATAU vendor, tidak boleh keduanya.';
        }

        if (blank($staff) && blank($vendor)) {
            return 'Pilih salah satu penanggung jawab: staff ATAU vendor.';
        }

        return null;
    }
}
