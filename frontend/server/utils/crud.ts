import { q, run, type Row } from './db'
import { requireAuth, requireRoles } from './auth'
import { paginate, validationError, notFound, like, logActivity } from './helpers'

export interface CrudOptions {
  table: string
  columns: string
  /** Validasi field pada store/update. Kembalikan pesan error atau null. */
  validators?: Record<string, (v: any, body: any) => string | null>
  /** Field opsional yang diizinkan di create/update (nama default wajib). */
  optionalFields?: string[]
  /** Field wajib saat create (selain nama). */
  requiredFields?: string[]
  /** Query param → kolom filter (exact match). */
  filterFields?: string[]
  /** Kolom untuk pencarian LIKE. */
  searchFields?: string[]
  /** Lampirkan relasi untuk list & show. */
  withRelations?: (rows: Row[]) => Promise<void>
  /** Cek konflik unik (store/update). Return true bila bentrok. */
  uniqueCheck?: (body: any, id?: number) => Promise<boolean>
  uniqueMessage?: string
  /** Hanya admin yang boleh tulis. */
  adminOnly?: boolean
  /** Pesan otorisasi. */
  denyMessage?: string
}

export function crudIndex(opts: CrudOptions) {
  return defineEventHandler(async (event) => {
    if (getMethod(event) === 'GET') {
      const query = getQuery(event)
      const conds: string[] = []
      const params: unknown[] = []

      for (const f of opts.filterFields ?? []) {
        if (query[f]) {
          conds.push(`${f} = $${params.length + 1}`)
          params.push(Number.isNaN(Number(query[f])) ? String(query[f]) : Number(query[f]))
        }
      }
      if ((opts.searchFields ?? []).length && query.q) {
        conds.push(`(${(opts.searchFields!).map((f, i) => `${f} LIKE $${params.length + i + 1}`).join(' OR ')})`)
        const likeVal = like(String(query.q))
        for (let i = 0; i < opts.searchFields!.length; i++) params.push(likeVal)
      }

      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
      const perPageDefault = opts.table === 'kelas' || opts.table === 'murid' ? 100 : 15
      const result = await paginate(event, `SELECT ${opts.columns} FROM ${opts.table} ${where} ORDER BY created_at DESC, id DESC`, params, perPageDefault)
      if (opts.withRelations) await opts.withRelations(result.data)
      return result
    }

    // POST
    const user = await requireAuth(event)
    if (opts.adminOnly) requireRoles(event, user, 'admin', opts.denyMessage ?? 'Hanya admin yang dapat mengakses fitur ini.')
    const body = await readBody(event).catch(() => ({}))

    const errors: Record<string, string[]> = {}
    const nama = String(body?.nama ?? '').trim()
    if (!nama) errors.nama = ['Nama wajib diisi.']
    for (const f of opts.requiredFields ?? []) {
      if (body?.[f] === undefined || body[f] === null || body[f] === '') errors[f] = ['Wajib diisi.']
    }

    const fields: string[] = []
    const params: unknown[] = []

    for (const [key, validate] of Object.entries(opts.validators ?? {})) {
      const err = body?.[key] !== undefined ? validate(body[key], body) : null
      if (err) errors[key] = [err]
    }
    if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)

    const placeholders: string[] = []
    push('nama', nama)
    for (const f of opts.optionalFields ?? []) {
      if (body?.[f] !== undefined && body[f] !== null && body[f] !== '') push(f, Number(body[f]))
    }
    if (opts.uniqueCheck && await opts.uniqueCheck(body)) {
      throw validationError(opts.uniqueMessage ?? 'Data dengan nama tersebut sudah ada.')
    }

    const cols = fields.map((f) => `"${f}"`).join(', ')
    const ph = placeholders.join(', ')
    const res = await run(
      `INSERT INTO ${opts.table} (${cols}, created_at, updated_at) VALUES (${ph}, now(), now()) RETURNING id`,
      params
    )
    const id = res.rows[0].id
    const row = (await q<Row>(`SELECT ${opts.columns} FROM ${opts.table} WHERE id = $1`, [id]))[0]!
    await logActivity('create', `Menambah ${opts.table} "${nama}"`, { type: `App\\Models\\${opts.table}`, id }, user.id)
    if (opts.withRelations) await opts.withRelations([row])
    return row

    function push(col: string, val: unknown) {
      fields.push(col)
      placeholders.push(`$${params.length + 1}`)
      params.push(val)
    }
  })
}

export function crudItem(opts: CrudOptions) {
  return defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = Number(getRouterParam(event, 'id'))
    const method = getMethod(event)

    const row = (await q<Row>(`SELECT ${opts.columns} FROM ${opts.table} WHERE id = $1`, [id]))[0] ?? null
    if (!row) throw notFound('Data tidak ditemukan.')

    if (method === 'GET') {
      if (opts.withRelations) await opts.withRelations([row])
      return row
    }

    if (method === 'PUT') {
      if (opts.adminOnly) requireRoles(event, user, 'admin', opts.denyMessage ?? 'Hanya admin yang dapat mengakses fitur ini.')
      const body = await readBody(event).catch(() => ({}))

      const errors: Record<string, string[]> = {}
      const fields: string[] = []
      const params: unknown[] = []
      const push = (col: string, val: unknown) => { fields.push(`"${col}" = $${params.length + 1}`); params.push(val) }

      if (body?.nama !== undefined) {
        const nama = String(body.nama ?? '').trim()
        if (!nama) errors.nama = ['Nama wajib diisi.']
        else push('nama', nama)
      }
      for (const [key, validate] of Object.entries(opts.validators ?? {})) {
        if (body?.[key] !== undefined) {
          const err = validate(body[key], body)
          if (err) errors[key] = [err]
        }
      }
      for (const f of opts.optionalFields ?? []) {
        if (body?.[f] !== undefined) push(f, body[f] === '' || body[f] === null ? null : Number(body[f]))
      }
      if (Object.keys(errors).length) throw validationError('Validasi gagal.', errors)
      if (opts.uniqueCheck && await opts.uniqueCheck(body, id)) {
        throw validationError(opts.uniqueMessage ?? 'Data dengan nama tersebut sudah ada.')
      }

      if (fields.length) {
        params.push(id)
        await run(`UPDATE ${opts.table} SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
      }

      const updated = (await q<Row>(`SELECT ${opts.columns} FROM ${opts.table} WHERE id = $1`, [id]))[0]!
      await logActivity('update', `Mengubah ${opts.table} #${id}`, { type: `App\\Models\\${opts.table}`, id }, user.id)
      if (opts.withRelations) await opts.withRelations([updated])
      return updated
    }

    if (method === 'DELETE') {
      if (opts.adminOnly) requireRoles(event, user, 'admin', opts.denyMessage ?? 'Hanya admin yang dapat mengakses fitur ini.')
      await run(`DELETE FROM ${opts.table} WHERE id = $1`, [id])
      return null
    }

    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  })
}
