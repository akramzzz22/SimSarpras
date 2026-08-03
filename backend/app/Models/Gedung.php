<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gedung extends Model
{
    protected $table = 'gedung';

    protected $fillable = ['nama'];

    public function ruangan()
    {
        return $this->hasMany(Ruangan::class);
    }
}
