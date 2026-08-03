<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Upload gambar (foto resi, dokumentasi, dsb) — dikembalikan URL publik.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'], // 5MB
        ]);

        $path = $request->file('file')->store('uploads', 'public');

        return response()->json([
            'url' => url('/storage/'.$path),
        ], 201);
    }
}
