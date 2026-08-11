import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachCount, attachProliList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'jurusan',
  columns: 'id, nama, created_at, updated_at',
  withRelations: async (rows) => {
    await attachCount(rows, 'proli', 'jurusan_id', 'proli_count')
    await attachProliList(rows, 'jurusan_id', 'proli')
  },
  ...uniqueNameCheck('jurusan', undefined, 'Jurusan dengan nama tersebut sudah ada.')
}

export default crudIndex(opts)
