<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barang', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('kode_qr')->unique();
            $table->enum('owner_type', ['sarpras', 'proli']);
            $table->foreignId('proli_id')->nullable()->constrained('proli')->nullOnDelete();
            $table->foreignId('kategori_id')->nullable()->constrained('kategori_barang')->nullOnDelete();
            $table->foreignId('ruangan_id')->nullable()->constrained('ruangan')->nullOnDelete();
            $table->enum('status', ['aktif', 'rusak', 'dipinjam', 'maintenance'])->default('aktif');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barang');
    }
};
