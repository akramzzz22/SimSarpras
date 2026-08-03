<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Murid extends Model
{
    protected $table = 'murid';

    protected $fillable = [
        'nis', 'nama', 'kelas_id', 'jurusan_id', 'proli_id', 'user_id'
    ];

    public function kelas()
    {
        return $this->belongsTo(Kelas::class);
    }

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }

    public function proli()
    {
        return $this->belongsTo(Proli::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
