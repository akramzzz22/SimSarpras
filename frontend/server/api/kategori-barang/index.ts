import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachCount, attachBarangList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'kategori_barang',
  columns: 'id, nama, created_at, updated_at',
  withRelations: async (rows) => {
    await attachCount(rows, 'barang', 'kategori_id', 'barang_count')
    await attachBarangList(rows, 'kategori_id', 'barang')
  },
  ...uniqueNameCheck('kategori_barang', undefined, 'Kategori dengan nama tersebut sudah ada.')
}

export default crudIndex(opts)
