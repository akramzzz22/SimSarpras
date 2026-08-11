import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachSimple } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'kelas',
  columns: 'id, nama, jurusan_id, created_at, updated_at',
  requiredFields: ['jurusan_id'],
  optionalFields: ['jurusan_id'],
  filterFields: ['jurusan_id'],
  searchFields: ['nama'],
  withRelations: async (rows) => {
    await attachSimple(rows, 'jurusan_id', 'jurusan', 'jurusan')
  },
  // Kelas unik per jurusan (boleh ada nama sama di jurusan berbeda).
  ...uniqueNameCheck(
    'kelas',
    { field: 'jurusan_id', getValue: (b) => (b?.jurusan_id != null ? Number(b.jurusan_id) : null) },
    'Kelas dengan nama tersebut sudah ada di jurusan ini.'
  )
}

export default crudIndex(opts)
