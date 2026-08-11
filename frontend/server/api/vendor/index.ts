import { crudIndex, type CrudOptions } from '../../utils/crud'
import { attachMaintenanceList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'vendor',
  columns: 'id, nama, kontak, alamat, keterangan, created_at, updated_at',
  optionalFields: ['kontak', 'alamat', 'keterangan'],
  withRelations: async (rows) => {
    await attachMaintenanceList(rows, 'vendor_id', 'maintenance')
  }
}

export default crudIndex(opts)
