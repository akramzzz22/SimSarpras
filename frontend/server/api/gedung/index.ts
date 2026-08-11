import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachCount, attachRuanganList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'gedung',
  columns: 'id, nama, created_at, updated_at',
  withRelations: async (rows) => {
    await attachCount(rows, 'ruangan', 'gedung_id', 'ruangan_count')
    await attachRuanganList(rows, 'gedung_id', 'ruangan')
  },
  ...uniqueNameCheck('gedung', undefined, 'Gedung dengan nama tersebut sudah ada.')
}

export default crudIndex(opts)
