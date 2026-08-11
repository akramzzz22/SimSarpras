import { q, run, type Row } from '../../utils/db'
import { requireAuth } from '../../utils/auth'
import { validationError, notFound } from '../../utils/helpers'
import { USER_COLS, attachSimple, attachMurid } from '../../utils/relations'
import { attachRolesTo } from '../../utils/roles-helpers'
import { authorizeAdmin, resolveRoles, syncRoles, storePlainPassword, hashPassword } from '../../utils/users-helpers'

async function load(id: number): Promise<Row | null> {
  return (await q<Row>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]))[0] ?? null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await authorizeAdmin(event, user)
  const id = Number(getRouterParam(event, 'id'))
  const method = getMethod(event)

  const target = await load(id)
  if (!target) throw notFound('User tidak ditemukan.')

  if (method === 'GET') {
    await attachRolesTo([target])
    await attachSimple([target], 'jurusan_id', 'jurusan', 'jurusan')
    return target
  }

  if (method === 'PUT') {
    const body = await readBody(event).catch(() => ({}))
    const fields: string[] = []
    const params: unknown[] = []
    const push = (col: string, val: unknown) => { fields.push(`${col} = $${params.length + 1}`); params.push(val) }
    const errors: Record<string, string[]> = {}

    if (body?.name !== undefined) {
      if (!String(body.name ?? '').trim()) errors.name = ['Nama wajib diisi.']
      else push('name', String(body.name).trim())
    }
    if (body?.email !== undefined) {
      const email = String(body.email ?? '').trim()
      if (!email) errors.email = ['Email wajib diisi.']
      else {
        const dup = await q(`SELECT 1 FROM users WHERE email = $1 AND id <> $2 LIMIT 1`, [email, id])
        if (dup.length) errors.email = ['Email sudah terdaftar.']
        else push('email', email)
      }
    }
    if (body?.password) push('password', hashPassword(String(body.password)))
    for (const [col, key] of [
      ['kelas', 'kelas'], ['nip', 'nip'], ['nuptk', 'nuptk'], ['tempat_lahir', 'tempat_lahir'],
      ['alamat', 'alamat'], ['no_hp', 'no_hp'], ['foto', 'foto']
    ] as const) {
      if (body?.[key] !== undefined) push(col, body[key])
    }
    if (body?.jurusan_id !== undefined) push('jurusan_id', body.jurusan_id == null ? null : Number(body.jurusan_id))
    if (body?.tanggal_lahir !== undefined) push('tanggal_lahir', body.tanggal_lahir || null)
    if (body?.jenis_kelamin !== undefined) push('jenis_kelamin', body.jenis_kelamin || null)

    const roles = resolveRoles(body)
    const rolesInvalid = roles.some((r) => !['admin', 'staff_sarpras', 'kaproli', 'guru', 'murid', 'kepsek'].includes(r))
    if (rolesInvalid) errors.roles = ['Role tidak valid.']
    if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

    if (fields.length) {
      params.push(id)
      await run(`UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    }
    if (body?.password) {
      await storePlainPassword(id, String(body.password))
    }
    if (roles.length) {
      await syncRoles(id, roles)
    }

    const updated = (await load(id))!
    await attachRolesTo([updated])
    await attachSimple([updated], 'jurusan_id', 'jurusan', 'jurusan')
    await attachMurid([updated], 'id', 'murid')
    return updated
  }

  if (method === 'DELETE') {
    if (target.id === user.id) {
      throw validationError('Tidak dapat menghapus akun sendiri.')
    }
    await run(`DELETE FROM users WHERE id = $1`, [id])
    return null
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
