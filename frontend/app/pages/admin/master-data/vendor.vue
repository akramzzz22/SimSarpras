<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Vendor' })

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Vendor' },
  { key: 'kontak', label: 'Kontak' },
  { key: 'alamat', label: 'Alamat' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Vendor', required: true, placeholder: 'Contoh: CV Teknik Jaya', colSpan: 'full' },
  { key: 'kontak', label: 'Kontak', placeholder: 'No. HP / telepon', colSpan: 'full' },
  { key: 'alamat', label: 'Alamat', type: 'textarea', colSpan: 'full' },
  { key: 'keterangan', label: 'Keterangan', type: 'textarea', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="vendor"
    title="Vendor"
    description="Kelola vendor penyedia jasa maintenance dan barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama', 'kontak']"
    search-placeholder="Cari vendor…"
  />
</template>
