<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('peminjaman', function (Blueprint $table) {
            $table->unsignedTinyInteger('jam_mulai')->nullable()->after('tanggal_pinjam');
            $table->unsignedTinyInteger('jam_selesai')->nullable()->after('jam_mulai');
            $table->text('foto_pinjam')->nullable()->after('jam_selesai');
            $table->text('foto_kembali')->nullable()->after('foto_pinjam');
            $table->dropColumn('tanggal_kembali');
        });
    }

    public function down(): void
    {
        Schema::table('peminjaman', function (Blueprint $table) {
            $table->dropColumn(['jam_mulai', 'jam_selesai', 'foto_pinjam', 'foto_kembali']);
            $table->date('tanggal_kembali')->nullable();
        });
    }
};
