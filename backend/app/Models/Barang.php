<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barang extends Model
{
    protected $table = 'barang';

    protected $fillable = [
        'nama', 'deskripsi', 'kode_qr', 'owner_type', 'proli_id',
        'kategori_id', 'ruangan_id', 'status'
    ];

    public function proli()
    {
        return $this->belongsTo(Proli::class);
    }

    public function kategori()
    {
        return $this->belongsTo(KategoriBarang::class, 'kategori_id');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class);
    }

    public function laporanKerusakan()
    {
        return $this->hasMany(LaporanKerusakan::class);
    }

    public function peminjaman()
    {
        return $this->hasMany(Peminjaman::class);
    }
}
