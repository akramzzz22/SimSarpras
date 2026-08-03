<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AkunPassword extends Model
{
    protected $table = 'akun_passwords';

    protected $fillable = [
        'user_id', 'password', 'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
