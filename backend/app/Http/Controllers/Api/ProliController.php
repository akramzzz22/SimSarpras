<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proli;
use Illuminate\Http\Request;

class ProliController extends Controller
{
    public function index(Request $request)
    {
        return Proli::with(['jurusan', 'ketuaProli'])
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'ketua_proli_id' => ['nullable', 'exists:users,id'],
        ]);

        $proli = Proli::create($data);

        return response()->json($proli->load(['jurusan', 'ketuaProli']), 201);
    }

    public function show(Proli $proli)
    {
        return $proli->load(['jurusan', 'ketuaProli', 'barang']);
    }

    public function update(Request $request, Proli $proli)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'ketua_proli_id' => ['nullable', 'exists:users,id'],
        ]);

        $proli->update($data);

        return response()->json($proli->load(['jurusan', 'ketuaProli']));
    }

    public function destroy(Proli $proli)
    {
        $proli->delete();

        return response()->json(null, 204);
    }
}
