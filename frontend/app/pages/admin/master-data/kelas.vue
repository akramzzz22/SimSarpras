<script setup lang="ts">
import type { CrudColumn, CrudField, CrudOption } from '~/components/master-data-crud.vue'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Kelas' })

const admin = useAdminService()

const loadJurusan = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('jurusan', { per_page: 100 })
  return res.data.map((j: any) => ({ value: j.id, label: j.nama }))
}

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Kelas' },
  {
    key: 'jurusan',
    label: 'Jurusan',
    badge: (item: any) => ({ text: item.jurusan?.nama ?? '—', cls: 'bg-blue-100 text-blue-800' })
  }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Kelas', required: true, placeholder: 'Contoh: XII RPL 1', colSpan: 'full' },
  {
    key: 'jurusan_id',
    label: 'Jurusan',
    type: 'select',
    optionLoaderKey: 'jurusan',
    required: true,
    hint: 'Kelas adalah sub-kategori dari jurusan.'
  }
]

const optionLoaders = { jurusan: loadJurusan }
</script>

<template>
  <MasterDataCrud
    resource="kelas"
    title="Kelas"
    description="Kelola kelas sebagai sub-kategori jurusan (mis. RPL: X RPL 1, XI RPL 1, XII RPL 1)."
    :columns="columns"
    :fields="fields"
    :option-loaders="optionLoaders"
    :group-by="(item: any) => item.jurusan?.nama ?? 'Tanpa Jurusan'"
    :search-keys="['nama']"
    search-placeholder="Cari kelas…"
    :delete-label="(item: any) => `kelas ${item.nama}`"
  />
</template>
