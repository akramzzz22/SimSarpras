<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Gedung' })

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Gedung' },
  { key: 'ruangan_count', label: 'Jumlah Ruangan' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Gedung', required: true, placeholder: 'Contoh: Gedung A', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="gedung"
    title="Gedung"
    description="Kelola data gedung sekolah."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari gedung…"
  />
</template>
