<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gedung;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function index(Request $request)
    {
        return Gedung::withCount('ruangan')
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        return response()->json(Gedung::create($data), 201);
    }

    public function show(Gedung $gedung)
    {
        return $gedung->load('ruangan');
    }

    public function update(Request $request, Gedung $gedung)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
        ]);

        $gedung->update($data);

        return response()->json($gedung);
    }

    public function destroy(Gedung $gedung)
    {
        $gedung->delete();

        return response()->json(null, 204);
    }
}
