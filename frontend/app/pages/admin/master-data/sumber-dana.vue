<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/widgets/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Sumber Dana' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Sumber Dana' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Sumber Dana', required: true, placeholder: 'Contoh: BOS Reguler, APBD Provinsi, Swadaya', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="sumber-dana"
    title="Sumber Dana"
    description="Kelola sumber dana pengadaan barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari sumber dana…"
  />
</template>
