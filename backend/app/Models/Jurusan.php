<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jurusan extends Model
{
    protected $table = 'jurusan';

    protected $fillable = ['nama'];

    public function proli()
    {
        return $this->hasMany(Proli::class);
    }
}
