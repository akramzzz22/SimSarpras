import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachSimple, attachBarangList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'ruangan',
  columns: 'id, nama, gedung_id, created_at, updated_at',
  optionalFields: ['gedung_id'],
  withRelations: async (rows) => {
    await attachSimple(rows, 'gedung_id', 'gedung', 'gedung')
    await attachBarangList(rows, 'ruangan_id', 'barang')
  },
  // Nama ruangan unik per gedung (boleh sama di gedung berbeda).
  ...uniqueNameCheck(
    'ruangan',
    {
      field: 'gedung_id',
      getValue: (b) => (b?.gedung_id != null && b.gedung_id !== '' ? Number(b.gedung_id) : null)
    },
    'Ruangan dengan nama tersebut sudah ada di gedung ini.'
  )
}

export default crudIndex(opts)
