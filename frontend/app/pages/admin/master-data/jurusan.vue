<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/widgets/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Jurusan' })

const columns: CrudColumn[] = [
  { key: 'nama', label: 'Nama Jurusan' },
  { key: 'proli_count', label: 'Jumlah Proli' }
]

const fields: CrudField[] = [
  { key: 'nama', label: 'Nama Jurusan', required: true, placeholder: 'Contoh: Teknik Komputer & Informatika', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="jurusan"
    title="Jurusan"
    description="Kelola data jurusan sekolah."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari jurusan…"
  />
</template>
