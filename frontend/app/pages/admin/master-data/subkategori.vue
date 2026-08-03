<script setup lang="ts">
import type { CrudColumn, CrudField, CrudOption } from '~/components/master-data-crud.vue'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Subkategori Barang' })

const admin = useAdminService()

const loadProli = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('proli', { per_page: 100 })
  return res.data.map((p: any) => ({ value: p.id, label: p.nama }))
}

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Subkategori' },
  {
    key: 'proli',
    label: 'Proli',
    badge: (item: any) => ({
      text: item.proli?.nama ?? '—',
      cls: 'bg-violet-100 text-violet-800'
    })
  }
]

const fields: CrudField[] = [
  {
    key: 'proli_id',
    label: 'Proli',
    type: 'select',
    optionLoaderKey: 'proli',
    required: true,
    colSpan: 'full',
    hint: 'Subkategori ini untuk barang milik proli yang mana?'
  },
  {
    key: 'nama',
    label: 'Nama Subkategori',
    required: true,
    placeholder: 'Contoh: Laptop, Router, Alat Bengkel',
    colSpan: 'full'
  }
]

const optionLoaders = { proli: loadProli }
</script>

<template>
  <MasterDataCrud
    resource="subkategori"
    title="Subkategori Barang"
    description="Kelola subkategori khusus per Proli untuk pengelompokan barang proli (mis. RPL: Laptop, PC — TKJ: Router, Switch)."
    :columns="columns"
    :fields="fields"
    :option-loaders="optionLoaders"
    :group-by="(item: any) => item.proli?.nama ?? 'Umum'"
    :search-keys="['nama']"
    search-placeholder="Cari subkategori…"
    :delete-label="(item: any) => `subkategori ${item.nama}`"
  />
</template>
