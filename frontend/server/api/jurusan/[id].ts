import { crudItem, type CrudOptions } from '../../utils/crud'
import { attachCount, attachProliList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'jurusan',
  columns: 'id, nama, created_at, updated_at',
  withRelations: async (rows) => {
    await attachCount(rows, 'proli', 'jurusan_id', 'proli_count')
    await attachProliList(rows, 'jurusan_id', 'proli')
  }
}

export default crudItem(opts)
