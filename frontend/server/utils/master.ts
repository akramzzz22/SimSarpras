import type { CrudOptions } from './crud'

export function masterOpts(table: string): CrudOptions {
  return {
    table,
    columns: 'id, nama, created_at, updated_at'
  }
}
