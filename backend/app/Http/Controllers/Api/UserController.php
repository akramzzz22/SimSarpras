<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AkunPassword;
use App\Models\Murid;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        return User::with(['roles', 'jurusan'])
            ->when($request->role, fn ($q, $role) => $q->role($role))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:admin,staff_sarpras,kaproli,guru,murid,kepsek'],
            'kelas' => ['nullable', 'string', 'max:50'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'kelas' => $data['kelas'] ?? null,
            'jurusan_id' => $data['jurusan_id'] ?? null,
        ]);

        $user->assignRole($data['role']);

        // Sinkronkan password plaintext agar fitur "Lihat Password" langsung akurat
        $this->storePlainPassword($user->id, $data['password']);

        return response()->json($user->load('roles'), 201);
    }

    public function show(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        return $user->load(['roles', 'jurusan']);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'nullable', 'in:admin,staff_sarpras,kaproli,guru,murid,kepsek'],
            'kelas' => ['nullable', 'string', 'max:50'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
        ]);

        $user->update(collect($data)->except(['password', 'role'])->all());

        if (! empty($data['password'])) {
            $user->update(['password' => $data['password']]);
            // Sinkronkan password plaintext agar fitur "Lihat Password" tetap akurat
            $this->storePlainPassword($user->id, $data['password']);
        }

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        return response()->json($user->load('roles'));
    }

    /**
     * Generate email & password untuk akun yang belum punya (dipakai akun murid
     * yang dibuat otomatis tanpa email/password, maupun role lain yang belum
     * punya akun login). Hanya admin.
     */
    public function generateAkun(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        if ($user->email) {
            return response()->json(['message' => 'Akun ini sudah memiliki email & password.'], 422);
        }

        $password = Str::random(10);
        $email = $this->buildEmail($user);

        $user->update([
            'email' => $email,
            'password' => $password,
        ]);

        $this->storePlainPassword($user->id, $password);

        return response()->json([
            'user_id' => $user->id,
            'nama' => $user->name,
            'email' => $email,
            'password' => $password,
            'generated' => true,
        ]);
    }

    /**
     * Reset password — password baru disimpan plaintext sementara agar bisa dilihat.
     * Hanya admin.
     */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        if (! $user->email) {
            return response()->json(['message' => 'Akun belum memiliki email. Buat akun terlebih dahulu.'], 422);
        }

        $password = Str::random(10);
        $user->update(['password' => $password]);
        $this->storePlainPassword($user->id, $password);

        return response()->json([
            'user_id' => $user->id,
            'nama' => $user->name,
            'email' => $user->email,
            'password' => $password,
            'generated' => true,
        ]);
    }

    /**
     * Lihat password plaintext yang disimpan sementara (tanpa reset).
     * HANYA admin — password asli dari users tetap ter-hash.
     */
    public function lihatPassword(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        $stored = AkunPassword::where('user_id', $user->id)->first();

        if (! $stored) {
            return response()->json(['message' => 'Belum ada password tersimpan. Generate atau reset password terlebih dahulu.'], 422);
        }

        // Password sementara sudah kedaluwarsa → minta generate ulang
        if ($stored->expires_at && $stored->expires_at->isPast()) {
            $stored->delete();
            return response()->json(['message' => 'Password sementara sudah kedaluwarsa. Silakan reset password.'], 422);
        }

        return response()->json([
            'user_id' => $user->id,
            'nama' => $user->name,
            'email' => $user->email,
            'password' => $stored->password,
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak dapat menghapus akun sendiri.'], 422);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    /** Hanya role admin yang boleh mengakses fitur password */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Hanya admin yang dapat mengakses fitur ini.');
    }

    /** Simpan password plaintext sementara (30 hari) di tabel khusus */
    private function storePlainPassword(int $userId, string $password): void
    {
        AkunPassword::updateOrCreate(
            ['user_id' => $userId],
            [
                'password' => $password,
                'expires_at' => now()->addDays(30),
            ]
        );
    }

    /** Email otomatis sesuai role: NIS+nama untuk murid, nama per-role untuk lainnya. */
    private function buildEmail(User $user): string
    {
        $slug = Str::slug($user->name, '.');
        $slug = strtolower(trim(preg_replace('/[^a-z0-9.]+/', '', $slug), '.'));
        $slug = $slug !== '' ? $slug : 'user'.$user->id;

        $role = $user->roles->first()?->name ?? 'sekolah';
        $domain = match ($role) {
            'murid' => 'murid.sch.id',
            'guru' => 'guru.sch.id',
            'staff_sarpras' => 'sarpras.sch.id',
            'kaproli' => 'kaproli.sch.id',
            'kepsek' => 'kepsek.sch.id',
            'admin' => 'admin.sch.id',
            default => 'sekolah.sch.id',
        };

        // Murid: prefix NIS agar email unik & mudah dikenali (mis. 1234567890.budi.santoso@murid.sch.id)
        $prefix = '';
        if ($role === 'murid') {
            $murid = Murid::where('user_id', $user->id)->first();
            $prefix = $murid ? $murid->nis.'.' : '';
        }

        $base = "{$prefix}{$slug}";
        $candidate = "{$base}@{$domain}";
        $i = 1;
        while (User::where('email', $candidate)->exists()) {
            $candidate = "{$base}{$i}@{$domain}";
            $i++;
        }

        return $candidate;
    }
}
