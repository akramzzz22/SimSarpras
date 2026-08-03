<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Kategori Barang' })

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Kategori' },
  { key: 'barang_count', label: 'Jumlah Barang' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Kategori', required: true, placeholder: 'Contoh: Elektronik', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="kategori-barang"
    title="Kategori Barang"
    description="Kelola kategori untuk pengelompokan barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari kategori…"
  />
</template>
