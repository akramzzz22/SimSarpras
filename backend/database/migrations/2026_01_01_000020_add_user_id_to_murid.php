<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('murid', function (Blueprint $table) {
            // Hubungkan data murid dengan akun login (users) — dibuat otomatis saat murid ditambahkan
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('murid', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
