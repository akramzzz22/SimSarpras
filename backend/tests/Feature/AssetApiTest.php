<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Maintenance;
use App\Models\Proli;
use App\Models\Subkategori;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function actingAsRole(string $role): User
    {
        $user = $this->userWithRole($role);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_login_returns_token_and_role(): void
    {
        $user = $this->userWithRole('admin');

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user', 'role']);
    }

    public function test_login_with_wrong_password_fails(): void
    {
        $user = $this->userWithRole('admin');

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'salah',
        ])->assertStatus(422);
    }

    public function test_admin_can_create_barang(): void
    {
        $this->actingAsRole('admin');
        $proli = Proli::create(['nama' => 'RPL']);

        $response = $this->postJson('/api/barang', [
            'nama' => 'Laptop Test',
            'owner_type' => 'proli',
            'proli_id' => $proli->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('nama', 'Laptop Test')
            ->assertJsonPath('owner_type', 'proli')
            ->assertJsonPath('status', 'aktif')
            ->assertJsonStructure(['kode_qr']);
    }

    public function test_barang_rejects_invalid_owner_type(): void
    {
        $this->actingAsRole('admin');

        $this->postJson('/api/barang', [
            'nama' => 'Barang Salah',
            'owner_type' => 'umum',
        ])->assertStatus(422);
    }

    public function test_admin_can_crud_subkategori(): void
    {
        $this->actingAsRole('admin');
        $proli = Proli::create(['nama' => 'TKJ']);

        $created = $this->postJson('/api/subkategori', [
            'nama' => 'Router',
            'proli_id' => $proli->id,
        ]);
        $created->assertCreated()->assertJsonPath('nama', 'Router');

        $id = $created->json('id');

        $this->getJson('/api/subkategori')->assertOk();

        $this->putJson("/api/subkategori/{$id}", ['nama' => 'Switch'])
            ->assertOk()
            ->assertJsonPath('nama', 'Switch');

        $this->deleteJson("/api/subkategori/{$id}")->assertStatus(204);
    }

    public function test_subkategori_must_match_barang_proli(): void
    {
        $this->actingAsRole('admin');
        $proliA = Proli::create(['nama' => 'RPL']);
        $proliB = Proli::create(['nama' => 'TKJ']);
        $sub = Subkategori::create(['nama' => 'Laptop', 'proli_id' => $proliA->id]);

        $this->postJson('/api/barang', [
            'nama' => 'Laptop Salah Proli',
            'owner_type' => 'proli',
            'proli_id' => $proliB->id,
            'subkategori_id' => $sub->id,
        ])->assertStatus(422);
    }

    public function test_non_admin_cannot_manage_subkategori(): void
    {
        $this->actingAsRole('guru');
        $proli = Proli::create(['nama' => 'RPL']);

        $this->postJson('/api/subkategori', [
            'nama' => 'Laptop',
            'proli_id' => $proli->id,
        ])->assertStatus(403);
    }

    public function test_maintenance_requires_penanggung_jawab(): void
    {
        $this->actingAsRole('admin');
        $barang = Barang::create([
            'nama' => 'AC Test',
            'kode_qr' => 'BRG-TEST01',
            'owner_type' => 'sarpras',
            'status' => 'aktif',
        ]);

        $this->postJson('/api/maintenance', [
            'barang_id' => $barang->id,
            'tanggal_jadwal' => now()->format('Y-m-d'),
        ])->assertStatus(422);
    }

    public function test_maintenance_requires_resi_when_biaya_exists(): void
    {
        $this->actingAsRole('admin');
        $barang = Barang::create([
            'nama' => 'AC Test',
            'kode_qr' => 'BRG-TEST02',
            'owner_type' => 'sarpras',
            'status' => 'aktif',
        ]);
        $staff = $this->userWithRole('staff_sarpras');

        $this->postJson('/api/maintenance', [
            'barang_id' => $barang->id,
            'tanggal_jadwal' => now()->format('Y-m-d'),
            'staff_id' => $staff->id,
            'biaya' => 250000,
        ])->assertStatus(422);
    }

    public function test_maintenance_notifies_assigned_staff(): void
    {
        $this->actingAsRole('admin');
        $barang = Barang::create([
            'nama' => 'AC Test',
            'kode_qr' => 'BRG-TEST03',
            'owner_type' => 'sarpras',
            'status' => 'aktif',
        ]);
        $staff = $this->userWithRole('staff_sarpras');

        $this->postJson('/api/maintenance', [
            'barang_id' => $barang->id,
            'tanggal_jadwal' => now()->format('Y-m-d'),
            'staff_id' => $staff->id,
        ])->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => User::class,
            'notifiable_id' => $staff->id,
        ]);

        // Staff bisa melihat notifikasinya
        Sanctum::actingAs($staff);
        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('unread_count', 1);
    }

    public function test_upload_requires_image(): void
    {
        $this->actingAsRole('staff_sarpras');

        $this->postJson('/api/upload', [])->assertStatus(422);
    }
}
