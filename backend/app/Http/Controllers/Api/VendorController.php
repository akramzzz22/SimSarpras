<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        return Vendor::latest()->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kontak' => ['nullable', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'keterangan' => ['nullable', 'string'],
        ]);

        return response()->json(Vendor::create($data), 201);
    }

    public function show(Vendor $vendor)
    {
        return $vendor->load('maintenance');
    }

    public function update(Request $request, Vendor $vendor)
    {
        $data = $request->validate([
            'nama' => ['sometimes', 'string', 'max:255'],
            'kontak' => ['nullable', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $vendor->update($data);

        return response()->json($vendor);
    }

    public function destroy(Vendor $vendor)
    {
        $vendor->delete();

        return response()->json(null, 204);
    }
}
