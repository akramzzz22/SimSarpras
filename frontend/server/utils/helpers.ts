import { q, one, run, type Row } from './db'

/** Waktu sekarang dalam ISO (untuk kolom created_at/updated_at). */
export function now(): string {
  return new Date().toISOString()
}

/** Buat response error JSON ({ message, errors? }). */
export function fail(status: number, message: string, errors?: Record<string, string[] | undefined>) {
  const data: Record<string, unknown> = { message }
  if (errors) data.errors = errors
  return createError({ statusCode: status, statusMessage: message, data })
}

export function validationError(message: string, errors?: Record<string, string[] | undefined>) {
  return fail(422, message, errors)
}

export function notFound(message = 'Data tidak ditemukan.') {
  return fail(404, message)
}

/** Pagination — { data, current_page, last_page, total, per_page, from, to }. */
export async function paginate(
  event: any,
  baseSql: string,
  params: unknown[] = [],
  perPageDefault = 15
) {
  const query = getQuery(event)
  const perPage = Math.min(1000, Math.max(1, Number(query.per_page) || perPageDefault))
  const page = Math.max(1, Number(query.page) || 1)

  const countRes = await one<{ total: number }>(`SELECT count(*) AS total FROM (${baseSql}) t`, params)
  const total = countRes?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const offset = (page - 1) * perPage

  const rows = await q(
    `${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, offset]
  )

  return {
    data: rows,
    current_page: page,
    last_page: lastPage,
    total,
    per_page: perPage,
    from: total === 0 ? null : offset + 1,
    to: Math.min(offset + perPage, total)
  }
}

/**
 * Tahun ajaran aktif — disimpan di page_settings (page_key='tahun-ajaran-aktif',
 * kolom aturan = JSON { tahun_ajaran_id, semester }). Sama seperti TahunAjaran::aktif().
 */
export async function aktifTahunAjaran(): Promise<{ tahun_ajaran_id: number; semester: string } | null> {
  const s = await one<{ aturan: string | null }>(
    `SELECT aturan FROM page_settings WHERE page_key = 'tahun-ajaran-aktif'`
  )
  if (!s?.aturan) return null
  try {
    const d = JSON.parse(s.aturan)
    const id = Number(d?.tahun_ajaran_id)
    if (!Number.isInteger(id) || id <= 0) return null
    const exists = await one(`SELECT id FROM tahun_ajaran WHERE id = $1`, [id])
    if (!exists) return null
    return { tahun_ajaran_id: id, semester: d?.semester === 'genap' ? 'genap' : 'ganjil' }
  } catch {
    return null
  }
}

export async function aktifTahunAjaranId(): Promise<number | null> {
  return (await aktifTahunAjaran())?.tahun_ajaran_id ?? null
}

/** Catat aktivitas pengguna (tidak melempar error bila gagal). */
export async function logActivity(
  action: string,
  description?: string | null,
  subject?: { type?: string | null; id?: number | null } | null,
  userId?: number | null
): Promise<void> {
  try {
    await run(
      `INSERT INTO activity_logs (user_id, action, subject_type, subject_id, description, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [userId ?? null, action, subject?.type ?? null, subject?.id ?? null, description ?? null, null]
    )
  } catch {
    // log tidak boleh menggagalkan alur utama
  }
}

/** Helper query "like" aman (wildcard %v%). */
export function like(v: string): string {
  return `%${v}%`
}
