<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Jenis Maintenance' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Jenis Maintenance' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Jenis Maintenance', required: true, placeholder: 'Contoh: Preventif, Korektif, Insidental', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="jenis-maintenance"
    title="Jenis Maintenance"
    description="Kelola jenis kegiatan maintenance barang."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari jenis maintenance…"
  />
</template>
