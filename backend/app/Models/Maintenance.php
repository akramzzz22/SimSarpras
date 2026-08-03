<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Maintenance extends Model
{
    protected $table = 'maintenance';

    protected $fillable = [
        'barang_id', 'tanggal_jadwal', 'staff_id', 'vendor_id',
        'status', 'dokumentasi_url', 'catatan', 'biaya', 'resi_url'
    ];

    protected $casts = [
        'biaya' => 'decimal:2',
    ];

    public function barang()
    {
        return $this->belongsTo(Barang::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }
}
