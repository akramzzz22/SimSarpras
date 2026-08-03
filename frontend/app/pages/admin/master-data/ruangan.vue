<script setup lang="ts">
import type { CrudColumn, CrudField, CrudOption } from '~/components/master-data-crud.vue'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Ruangan' })

const admin = useAdminService()

const loadGedung = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('gedung', { per_page: 100 })
  return res.data.map((g: any) => ({ value: g.id, label: g.nama }))
}

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Ruangan' },
  { key: 'gedung', label: 'Gedung', render: (item: any) => item.gedung?.nama ?? '—' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Ruangan', required: true, placeholder: 'Contoh: Lab Komputer 1', colSpan: 'full' },
  { key: 'gedung_id', label: 'Gedung', type: 'select', optionLoaderKey: 'gedung' }
]

const optionLoaders = { gedung: loadGedung }
</script>

<template>
  <MasterDataCrud
    resource="ruangan"
    title="Ruangan"
    description="Kelola data ruangan dan lokasinya di gedung."
    :columns="columns"
    :fields="fields"
    :option-loaders="optionLoaders"
    :search-keys="['nama']"
    search-placeholder="Cari ruangan…"
  />
</template>
