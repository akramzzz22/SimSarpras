<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    protected $table = 'peminjaman';

    protected $fillable = [
        'barang_id', 'peminjam_id', 'status',
        'tanggal_pinjam', 'jam_mulai', 'jam_selesai', 'keperluan',
        'foto_pinjam', 'foto_kembali', 'disetujui_oleh'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class);
    }

    public function peminjam()
    {
        return $this->belongsTo(User::class, 'peminjam_id');
    }

    public function penyetuju()
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
