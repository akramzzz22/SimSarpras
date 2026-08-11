import { crudItem, type CrudOptions } from '../../utils/crud'
import { attachSimple, attachBarangList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'ruangan',
  columns: 'id, nama, gedung_id, created_at, updated_at',
  optionalFields: ['gedung_id'],
  withRelations: async (rows) => {
    await attachSimple(rows, 'gedung_id', 'gedung', 'gedung')
    await attachBarangList(rows, 'ruangan_id', 'barang')
  }
}

export default crudItem(opts)
