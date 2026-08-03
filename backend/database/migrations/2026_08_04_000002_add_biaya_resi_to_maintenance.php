<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance', function (Blueprint $table) {
            $table->decimal('biaya', 12, 2)->nullable()->after('catatan');
            $table->string('resi_url')->nullable()->after('biaya');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance', function (Blueprint $table) {
            $table->dropColumn(['biaya', 'resi_url']);
        });
    }
};
