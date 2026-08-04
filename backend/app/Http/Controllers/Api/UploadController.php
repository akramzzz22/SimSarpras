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

        // Path relatif (bukan URL absolut) — frontend Nuxt mem-proxy /storage/**
        // ke backend, sehingga tetap aman (no mixed-content) saat dibuka dari HP
        // via HTTPS LAN (https://192.168.0.2:3000).
        return response()->json([
            'url' => '/storage/'.$path,
        ], 201);
    }
}
