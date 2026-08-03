<script setup lang="ts">
import type { CrudColumn, CrudField, CrudOption } from '~/components/master-data-crud.vue'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Data Murid' })

const admin = useAdminService()

const loadJurusan = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('jurusan', { per_page: 100 })
  return res.data.map((j: any) => ({ value: j.id, label: j.nama }))
}

// Kelas dimuat berdasarkan jurusan yang dipilih (sub-kategori jurusan)
const loadKelas = async (deps?: Record<string, any>): Promise<CrudOption[]> => {
  const jurusanId = deps?.jurusan_id
  if (!jurusanId) return []
  const res = await admin.master.list('kelas', { per_page: 100, jurusan_id: jurusanId })
  return res.data.map((k: any) => ({ value: k.id, label: k.nama }))
}

const loadProli = async (): Promise<CrudOption[]> => {
  const res = await admin.master.list('proli', { per_page: 100 })
  return res.data.map((p: any) => ({ value: p.id, label: p.nama }))
}

const columns: CrudColumn[] = [
  { key: 'nis', label: 'NIS' },
  { key: 'nama', label: 'Nama Murid' },
  {
    key: 'kelas',
    label: 'Kelas',
    render: (item: any) => item.kelas?.nama ?? '—',
    badge: (item: any) => ({ text: item.kelas?.nama ?? '—', cls: 'bg-violet-100 text-violet-800' })
  },
  { key: 'jurusan', label: 'Jurusan', render: (item: any) => item.jurusan?.nama ?? '—' },
  { key: 'proli', label: 'Proli', render: (item: any) => item.proli?.nama ?? '—' }
]

const fields: CrudField[] = [
  { key: 'nis', label: 'NIS', required: true, placeholder: 'Contoh: 1234567890' },
  { key: 'nama', label: 'Nama Lengkap', required: true, placeholder: 'Contoh: Budi Santoso' },
  {
    key: 'jurusan_id',
    label: 'Jurusan',
    type: 'select',
    optionLoaderKey: 'jurusan',
    colSpan: 'full',
    hint: 'Pilih jurusan terlebih dahulu, lalu pilih kelasnya.'
  },
  {
    key: 'kelas_id',
    label: 'Kelas',
    type: 'select',
    optionLoaderKey: 'kelas',
    dependsOn: 'jurusan_id',
    required: true,
    colSpan: 'full',
    hint: 'Sub-kategori dari jurusan. Akun login murid dibuat otomatis — kelola akun di Pengaturan → Akun.'
  },
  { key: 'proli_id', label: 'Proli', type: 'select', optionLoaderKey: 'proli' }
]

const optionLoaders = { jurusan: loadJurusan, kelas: loadKelas, proli: loadProli }
</script>

<template>
  <MasterDataCrud
    resource="murid"
    title="Data Murid"
    description="Kelola data murid (NIS, nama, kelas, jurusan, proli). Akun login murid dibuat otomatis — kelola di Pengaturan → Akun."
    :columns="columns"
    :fields="fields"
    :option-loaders="optionLoaders"
    :group-by="(item: any) => item.kelas?.nama ?? 'Tanpa Kelas'"
    :search-keys="['nama', 'nis']"
    search-placeholder="Cari nama atau NIS…"
    :delete-label="(item: any) => `murid ${item.nama}`"
  />
</template>
