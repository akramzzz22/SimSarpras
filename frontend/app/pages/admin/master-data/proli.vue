<script setup lang="ts">
import type { CrudColumn, CrudField, CrudOption } from '~/components/master-data-crud.vue'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Proli' })

const admin = useAdminService()

const loadJurusan = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('jurusan', { per_page: 100 })
  return res.data.map((j: any) => ({ value: j.id, label: j.nama }))
}

const loadKetuaProli = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('users', { role: 'kaproli', per_page: 100 })
  return res.data.map((u: any) => ({ value: u.id, label: u.name }))
}

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Proli' },
  { key: 'jurusan', label: 'Jurusan', render: (item: any) => item.jurusan?.nama ?? '—' },
  { key: 'ketua', label: 'Ketua Proli', render: (item: any) => item.ketuaProli?.name ?? '—' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Proli', required: true, placeholder: 'Contoh: Rekayasa Perangkat Lunak', colSpan: 'full' },
  { key: 'jurusan_id', label: 'Jurusan', type: 'select', optionLoaderKey: 'jurusan' },
  { key: 'ketua_proli_id', label: 'Ketua Proli', type: 'select', optionLoaderKey: 'ketua' }
]

const optionLoaders = { jurusan: loadJurusan, ketua: loadKetuaProli }
</script>

<template>
  <MasterDataCrud
    resource="proli"
    title="Proli"
    description="Kelola program keahlian beserta jurusan dan ketuanya."
    :columns="columns"
    :fields="fields"
    :option-loaders="optionLoaders"
    :search-keys="['nama']"
    search-placeholder="Cari proli…"
  />
</template>
