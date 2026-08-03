<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use Illuminate\Http\Request;

class JurusanController extends Controller
{
    public function index(Request $request)
    {
        return Jurusan::withCount('proli')
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
        ]);

        return response()->json(Jurusan::create($data), 201);
    }

    public function show(Jurusan $jurusan)
    {
        return $jurusan->load('proli');
    }

    public function update(Request $request, Jurusan $jurusan)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
        ]);

        $jurusan->update($data);

        return response()->json($jurusan);
    }

    public function destroy(Jurusan $jurusan)
    {
        $jurusan->delete();

        return response()->json(null, 204);
    }
}
