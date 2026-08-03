<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabel KHUSUS admin: menyimpan password plaintext sementara agar bisa "dilihat"
        // tanpa reset. Hanya boleh diakses oleh role admin. Berakhir (expired) otomatis.
        Schema::create('akun_passwords', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('password');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('akun_passwords');
    }
};
