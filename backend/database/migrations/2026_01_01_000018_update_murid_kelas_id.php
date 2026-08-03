<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('murid', function (Blueprint $table) {
            // Ganti teks kelas bebas menjadi relasi ke tabel kelas (sub-kategori jurusan)
            $table->foreignId('kelas_id')->nullable()->after('nama')->constrained('kelas')->nullOnDelete();
            $table->dropColumn('kelas');
        });
    }

    public function down(): void
    {
        Schema::table('murid', function (Blueprint $table) {
            $table->string('kelas')->nullable()->after('nama');
            $table->dropConstrainedForeignId('kelas_id');
        });
    }
};
