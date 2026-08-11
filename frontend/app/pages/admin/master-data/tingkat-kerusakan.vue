<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/widgets/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Tingkat Kerusakan' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Tingkat Kerusakan' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Tingkat Kerusakan', required: true, placeholder: 'Contoh: Ringan, Sedang, Berat', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="tingkat-kerusakan"
    title="Tingkat Kerusakan"
    description="Kelola tingkat keparahan kerusakan barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari tingkat kerusakan…"
  />
</template>
