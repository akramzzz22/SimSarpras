import { crudItem, type CrudOptions } from '../../utils/crud'
import { attachSimple, attachUser, attachBarangList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'proli',
  columns: 'id, nama, jurusan_id, ketua_proli_id, created_at, updated_at',
  optionalFields: ['jurusan_id', 'ketua_proli_id'],
  withRelations: async (rows) => {
    await attachSimple(rows, 'jurusan_id', 'jurusan', 'jurusan')
    await attachUser(rows, 'ketua_proli_id', 'ketuaProli')
    await attachBarangList(rows, 'proli_id', 'barang')
  }
}

export default crudItem(opts)
