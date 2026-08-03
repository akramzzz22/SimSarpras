<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Murid;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MuridController extends Controller
{
    public function index(Request $request)
    {
        return Murid::with(['kelas', 'jurusan', 'proli'])
            ->when($request->kelas_id, fn ($q, $v) => $q->where('kelas_id', $v))
            ->when($request->jurusan_id, fn ($q, $v) => $q->where('jurusan_id', $v))
            ->when($request->q, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $qq->where('nama', 'like', "%{$v}%")
                    ->orWhere('nis', 'like', "%{$v}%");
            }))
            ->latest()
            ->paginate($request->integer('per_page', 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nis' => ['required', 'string', 'max:50', 'unique:murid,nis'],
            'nama' => ['required', 'string', 'max:255'],
            'kelas_id' => ['required', 'exists:kelas,id'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'proli_id' => ['nullable', 'exists:proli,id'],
        ]);

        // Akun login (role murid) dibuat otomatis tanpa email & password
        // (email & password di-generate belakangan lewat tombol "Buat Akun")
        $user = User::create([
            'name' => $data['nama'],
            'email' => null,
            'password' => null,
            'kelas' => $this->kelasNama($data['kelas_id']),
            'jurusan_id' => $data['jurusan_id'] ?? null,
        ]);
        $user->assignRole('murid');

        $murid = Murid::create([...$data, 'user_id' => $user->id]);

        return response()->json($murid->load(['kelas', 'jurusan', 'proli', 'user']), 201);
    }

    public function show(Murid $murid)
    {
        return $murid->load(['kelas', 'jurusan', 'proli', 'user']);
    }

    public function update(Request $request, Murid $murid)
    {
        $data = $request->validate([
            'nis' => ['sometimes', 'string', 'max:50', Rule::unique('murid', 'nis')->ignore($murid->id)],
            'nama' => ['sometimes', 'string', 'max:255'],
            'kelas_id' => ['sometimes', 'exists:kelas,id'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'proli_id' => ['nullable', 'exists:proli,id'],
        ]);

        $murid->update($data);

        // Sinkronkan nama/kelas/jurusan ke akun login bila ada
        if ($murid->user_id) {
            $murid->user->update([
                'name' => $data['nama'] ?? $murid->user->name,
                'kelas' => isset($data['kelas_id'])
                    ? $this->kelasNama($data['kelas_id'])
                    : $murid->user->kelas,
                'jurusan_id' => $data['jurusan_id'] ?? $murid->user->jurusan_id,
            ]);
        }

        return response()->json($murid->load(['kelas', 'jurusan', 'proli', 'user']));
    }

    public function destroy(Murid $murid)
    {
        $user = $murid->user;

        // Hapus data murid dulu agar tidak memblokir FK dari murid
        $murid->delete();

        // Hapus akun login jika tidak punya riwayat (peminjaman/laporan) yang mengikat
        if ($user) {
            $hasHistory = $user->peminjaman()->exists() || $user->laporanKerusakan()->exists();
            if (! $hasHistory) {
                $user->delete();
            }
        }

        return response()->json(null, 204);
    }

    private function kelasNama(int $kelasId): ?string
    {
        return \App\Models\Kelas::find($kelasId)?->nama;
    }
}
