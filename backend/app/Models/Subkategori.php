<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subkategori extends Model
{
    protected $table = 'subkategori';

    protected $fillable = [
        'nama', 'proli_id'
    ];

    public function proli()
    {
        return $this->belongsTo(Proli::class);
    }

    public function barang()
    {
        return $this->hasMany(Barang::class);
    }
}
