<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KategoriBarang;
use Illuminate\Http\Request;

class KategoriBarangController extends Controller
{
    public function index(Request $request)
    {
        return KategoriBarang::withCount('barang')
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        return response()->json(KategoriBarang::create($data), 201);
    }

    public function show(KategoriBarang $kategoriBarang)
    {
        return $kategoriBarang->load('barang');
    }

    public function update(Request $request, KategoriBarang $kategoriBarang)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
        ]);

        $kategoriBarang->update($data);

        return response()->json($kategoriBarang);
    }

    public function destroy(KategoriBarang $kategoriBarang)
    {
        $kategoriBarang->delete();

        return response()->json(null, 204);
    }
}
