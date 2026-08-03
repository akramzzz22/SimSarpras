<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LaporanKerusakan extends Model
{
    protected $table = 'laporan_kerusakan';

    protected $fillable = [
        'barang_id', 'pelapor_id', 'deskripsi', 'foto_url',
        'status', 'assigned_to', 'vendor_id', 'hasil_perbaikan_url'
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class);
    }

    public function pelapor()
    {
        return $this->belongsTo(User::class, 'pelapor_id');
    }

    public function assignedStaff()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }
}
