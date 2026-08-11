import type { CrudOptions } from './crud'
import { uniqueNameCheck } from './crud'

export function masterOpts(table: string): CrudOptions {
  return {
    table,
    columns: 'id, nama, created_at, updated_at',
    // Cegah nama ganda (di form & import CSV)
    ...uniqueNameCheck(table)
  }
}
