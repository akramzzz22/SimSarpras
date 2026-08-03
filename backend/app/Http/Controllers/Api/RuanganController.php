<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ruangan;
use Illuminate\Http\Request;

class RuanganController extends Controller
{
    public function index(Request $request)
    {
        return Ruangan::with('gedung')
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'gedung_id' => ['nullable', 'exists:gedung,id'],
        ]);

        $ruangan = Ruangan::create($data);

        return response()->json($ruangan->load('gedung'), 201);
    }

    public function show(Ruangan $ruangan)
    {
        return $ruangan->load(['gedung', 'barang']);
    }

    public function update(Request $request, Ruangan $ruangan)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'gedung_id' => ['nullable', 'exists:gedung,id'],
        ]);

        $ruangan->update($data);

        return response()->json($ruangan->load('gedung'));
    }

    public function destroy(Ruangan $ruangan)
    {
        $ruangan->delete();

        return response()->json(null, 204);
    }
}
