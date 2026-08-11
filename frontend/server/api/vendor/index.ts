import { crudIndex, type CrudOptions, uniqueNameCheck } from '../../utils/crud'
import { attachMaintenanceList } from '../../utils/relations'

const opts: CrudOptions = {
  table: 'vendor',
  columns: 'id, nama, kontak, alamat, keterangan, created_at, updated_at',
  optionalFields: ['kontak', 'alamat', 'keterangan'],
  withRelations: async (rows) => {
    await attachMaintenanceList(rows, 'vendor_id', 'maintenance')
  },
  ...uniqueNameCheck('vendor', undefined, 'Vendor dengan nama tersebut sudah ada.')
}

export default crudIndex(opts)
