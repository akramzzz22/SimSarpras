import { q } from '../../utils/db'
import { crudItem, type CrudOptions } from '../../utils/crud'
import { attachSimple } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'kelas',
  columns: 'id, nama, jurusan_id, created_at, updated_at',
  optionalFields: ['jurusan_id'],
  withRelations: async (rows) => {
    await attachSimple(rows, 'jurusan_id', 'jurusan', 'jurusan')
  },
  uniqueCheck: async (body, id) => {
    const nama = String(body?.nama ?? '').trim()
    const jurusanId = body?.jurusan_id != null ? Number(body.jurusan_id) : undefined
    if (!nama || !jurusanId) return false
    const rows = await q(
      `SELECT 1 FROM kelas WHERE nama = $1 AND jurusan_id = $2 ${id ? 'AND id <> $3' : ''} LIMIT 1`,
      id ? [nama, jurusanId, id] : [nama, jurusanId]
    )
    return rows.length > 0
  },
  uniqueMessage: 'Kelas dengan nama tersebut sudah ada di jurusan ini.'
}

export default crudItem(opts)
