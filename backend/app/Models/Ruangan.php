<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruangan extends Model
{
    protected $table = 'ruangan';

    protected $fillable = ['nama', 'gedung_id'];

    public function gedung()
    {
        return $this->belongsTo(Gedung::class);
    }

    public function barang()
    {
        return $this->hasMany(Barang::class);
    }
}
