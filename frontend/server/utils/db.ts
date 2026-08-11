import pg from 'pg'

// Koneksi PostgreSQL — nilai bawaan (database sarpras).
const pool = new pg.Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE || 'sarpras',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10
})

// bigint (OID 20) → number, agar id & *_id cocok dengan tipe number di frontend
// (pg default memberi string untuk int8).
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)))

export interface Row {
  [key: string]: any
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

export async function run(text: string, params: unknown[] = []) {
  return pool.query(text, params)
}

export interface Tx {
  q: <R = Row>(text: string, params?: unknown[]) => Promise<R[]>
  run: (text: string, params?: unknown[]) => Promise<pg.QueryResult>
}

/**
 * Jalankan callback dalam satu transaksi — commit otomatis bila sukses,
 * rollback bila error. Dipakai untuk operasi multi-tabel yang harus atomik
 * (mis. catat mutasi + ubah stok barang).
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tx: Tx = {
      q: (text, params = []) => client.query(text, params).then((r) => r.rows as any[]),
      run: (text, params = []) => client.query(text, params)
    }
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
