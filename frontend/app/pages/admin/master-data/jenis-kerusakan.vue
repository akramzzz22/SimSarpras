<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/widgets/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Jenis Kerusakan' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Jenis Kerusakan' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Jenis Kerusakan', required: true, placeholder: 'Contoh: Hardware, Software, Instalasi Listrik', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="jenis-kerusakan"
    title="Jenis Kerusakan"
    description="Kelola jenis kerusakan untuk laporan kerusakan barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari jenis kerusakan…"
  />
</template>
