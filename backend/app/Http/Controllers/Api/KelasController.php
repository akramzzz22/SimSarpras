<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use Illuminate\Http\Request;

class KelasController extends Controller
{
    public function index(Request $request)
    {
        return Kelas::with(['jurusan'])
            ->when($request->jurusan_id, fn ($q, $v) => $q->where('jurusan_id', $v))
            ->when($request->q, fn ($q, $v) => $q->where('nama', 'like', "%{$v}%"))
            ->latest()
            ->paginate($request->integer('per_page', 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:100'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
        ]);

        // Nama kelas unik dalam satu jurusan
        $exists = Kelas::where('nama', $data['nama'])->where('jurusan_id', $data['jurusan_id'])->exists();
        abort_if($exists, 422, 'Kelas dengan nama tersebut sudah ada di jurusan ini.');

        return response()->json(Kelas::create($data), 201);
    }

    public function show(Kelas $kelas)
    {
        return $kelas->load('jurusan');
    }

    public function update(Request $request, Kelas $kelas)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:100'],
            'jurusan_id' => ['sometimes', 'exists:jurusan,id'],
        ]);

        $nama = $data['nama'] ?? $kelas->nama;
        $jurusanId = $data['jurusan_id'] ?? $kelas->jurusan_id;
        $exists = Kelas::where('nama', $nama)
            ->where('jurusan_id', $jurusanId)
            ->where('id', '!=', $kelas->id)
            ->exists();
        abort_if($exists, 422, 'Kelas dengan nama tersebut sudah ada di jurusan ini.');

        $kelas->update($data);

        return response()->json($kelas->load('jurusan'));
    }

    public function destroy(Kelas $kelas)
    {
        $kelas->delete();

        return response()->json(null, 204);
    }
}
