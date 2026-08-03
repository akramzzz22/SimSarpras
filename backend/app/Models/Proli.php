<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proli extends Model
{
    protected $table = 'proli';
    protected $fillable = ['nama', 'jurusan_id', 'ketua_proli_id'];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }

    public function ketuaProli()
    {
        return $this->belongsTo(User::class, 'ketua_proli_id');
    }

    public function barang()
    {
        return $this->hasMany(Barang::class);
    }
}
