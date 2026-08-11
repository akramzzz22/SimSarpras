<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Kondisi Barang' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Kondisi Barang' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Kondisi Barang', required: true, placeholder: 'Contoh: Baik, Rusak Ringan, Rusak Berat', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="kondisi-barang"
    title="Kondisi Barang"
    description="Kelola daftar kondisi barang untuk pencatatan aset."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari kondisi…"
  />
</template>
