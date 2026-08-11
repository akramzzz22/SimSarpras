import { crudIndex, type CrudOptions } from '../../utils/crud'
import { attachCount, attachRuanganList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'gedung',
  columns: 'id, nama, created_at, updated_at',
  withRelations: async (rows) => {
    await attachCount(rows, 'ruangan', 'gedung_id', 'ruangan_count')
    await attachRuanganList(rows, 'gedung_id', 'ruangan')
  }
}

export default crudIndex(opts)
