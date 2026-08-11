<script setup lang="ts">
import type { CrudColumn, CrudField } from '~/components/widgets/master-data-crud.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Status Barang' })

const columns: CrudColumn[] = [{ key: 'nama', label: 'Status Barang' }]
const fields: CrudField[] = [
  { key: 'nama', label: 'Status Barang', required: true, placeholder: 'Contoh: aktif, rusak, dipinjam, maintenance', colSpan: 'full' }
]
</script>

<template>
  <MasterDataCrud
    resource="status-barang"
    title="Status Barang"
    description="Kelola daftar status barang. Nilai bawaan: aktif, rusak, dipinjam, maintenance."
    :columns="columns"
    :fields="fields"
    :search-keys="['nama']"
    search-placeholder="Cari status…"
  />
</template>
