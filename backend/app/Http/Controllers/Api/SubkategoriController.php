<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subkategori;
use Illuminate\Http\Request;

class SubkategoriController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        return Subkategori::with('proli')
            ->when($request->proli_id, fn ($q, $v) => $q->where('proli_id', $v))
            ->latest()
            ->paginate($request->integer('per_page', 100));
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'proli_id' => ['required', 'exists:proli,id'],
        ]);

        return response()->json(Subkategori::create($data)->load('proli'), 201);
    }

    public function update(Request $request, Subkategori $subkategori)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'proli_id' => ['sometimes', 'exists:proli,id'],
        ]);

        $subkategori->update($data);

        return response()->json($subkategori->load('proli'));
    }

    public function destroy(Request $request, Subkategori $subkategori)
    {
        $this->authorizeAdmin($request);

        $subkategori->delete();

        return response()->json(null, 204);
    }

    /** Hanya role admin yang boleh mengelola subkategori */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Hanya admin yang dapat mengakses fitur ini.');
    }
}
