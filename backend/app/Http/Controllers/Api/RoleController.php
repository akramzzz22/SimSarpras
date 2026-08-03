<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        $table = config('permission.table_names.model_has_roles', 'model_has_roles');

        $counts = DB::table($table)
            ->select('role_id', DB::raw('count(*) as total'))
            ->groupBy('role_id')
            ->pluck('total', 'role_id');

        return Role::orderBy('name')->get()->map(function (Role $role) use ($counts) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'users_count' => (int) ($counts[$role->id] ?? 0),
            ];
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);

        return response()->json($role, 201);
    }

    public function destroy(Role $role)
    {
        if ($role->name === 'admin') {
            return response()->json(['message' => 'Role admin tidak dapat dihapus.'], 422);
        }

        $role->delete();

        return response()->json(null, 204);
    }
}
