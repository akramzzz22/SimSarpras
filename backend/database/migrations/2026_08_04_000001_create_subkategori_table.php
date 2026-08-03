<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Subkategori khusus per Proli — untuk barang milik proli
        // (mis. RPL: Laptop, PC, Printer — TKJ: Router, Switch, Kabel Jaringan).
        Schema::create('subkategori', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->foreignId('proli_id')->constrained('proli')->cascadeOnDelete();
            $table->timestamps();
        });

        // Barang proli bisa ditautkan ke subkategori milik proli-nya
        Schema::table('barang', function (Blueprint $table) {
            $table->foreignId('subkategori_id')
                ->nullable()
                ->after('kategori_id')
                ->constrained('subkategori')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('barang', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subkategori_id');
        });
        Schema::dropIfExists('subkategori');
    }
};
