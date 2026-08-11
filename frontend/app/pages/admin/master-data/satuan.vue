<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Satuan' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Nama Satuan' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Satuan', required: true, placeholder: 'Contoh: Unit, Buah, Set', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="satuan"
    title="Satuan"
    description="Kelola satuan ukuran barang (unit, buah, set, dsb)."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari satuan…"
  />
</template>
