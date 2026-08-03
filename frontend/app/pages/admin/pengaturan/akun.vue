<script setup lang="ts">
import { ref } from 'vue'
import { KeyRound, RefreshCw, Eye, Copy, Check, X } from 'lucide-vue-next'
import type { CrudColumn, CrudField, CrudOption, CrudRowAction } from '~/components/master-data-crud.vue'
import MasterDataCrud from '~/components/master-data-crud.vue'
import { useAdminService, type AkunMurid } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Pengaturan Akun' })

const admin = useAdminService()
const crudRef = ref<InstanceType<typeof MasterDataCrud> | null>(null)

const roleCls: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  staff_sarpras: 'bg-teal-100 text-teal-800',
  kaproli: 'bg-violet-100 text-violet-800',
  guru: 'bg-emerald-100 text-emerald-800',
  murid: 'bg-amber-100 text-amber-800',
  kepsek: 'bg-rose-100 text-rose-800'
}

const columns: CrudColumn[] = [
  { key: 'name', label: 'Nama' },
  {
    key: 'email',
    label: 'Akun Login',
    badge: (item: any) =>
      item.email
        ? { text: item.email, cls: 'bg-emerald-100 text-emerald-800' }
        : { text: 'Belum ada akun', cls: 'bg-amber-100 text-amber-800' }
  },
  {
    key: 'kelas',
    label: 'Kelas',
    render: (item: any) => item.kelas || '—'
  },
  {
    key: 'jurusan',
    label: 'Jurusan',
    render: (item: any) => item.jurusan?.nama || '—'
  },
  {
    key: 'roles',
    label: 'Role',
    badge: (item: any) => {
      const role = item.roles?.[0]?.name ?? ''
      return { text: role.replace('_', ' '), cls: roleCls[role] ?? 'bg-gray-100 text-gray-700' }
    }
  }
]

const roleOptions: CrudOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff_sarpras', label: 'Staff Sarpras' },
  { value: 'kaproli', label: 'Ketua Proli' },
  { value: 'guru', label: 'Guru' },
  { value: 'murid', label: 'Murid' },
  { value: 'kepsek', label: 'Kepala Sekolah' }
]

const optionLoaders = {
  jurusan: async () => {
    const res = await admin.master.list('jurusan', { per_page: 100 })
    return res.data.map((j: any) => ({ value: j.id, label: j.nama }))
  }
}

const fields: CrudField[] = [
  { key: 'name', label: 'Nama Lengkap', required: true, placeholder: 'Contoh: Budi Santoso' },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'nama@sekolah.sch.id',
    hint: 'Kosongkan email & gunakan tombol "Buat Akun" agar email + password di-generate otomatis sesuai role.'
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    optionalOnEdit: true,
    placeholder: 'Minimal 8 karakter',
    hint: 'Kosongkan jika tidak ingin mengubah password.',
    colSpan: 'full'
  },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: roleOptions,
    populate: (item: any) => item.roles?.[0]?.name ?? '',
    colSpan: 'full'
  },
  {
    key: 'kelas',
    label: 'Kelas (khusus Murid)',
    placeholder: 'Contoh: XII RPL 1',
    hint: 'Kelas & rombel siswa, misal "XII RPL 1".',
    colSpan: 'half'
  },
  {
    key: 'jurusan_id',
    label: 'Jurusan',
    type: 'select',
    optionLoaderKey: 'jurusan',
    populate: (item: any) => item.jurusan?.id ?? '',
    hint: 'Pilih jurusan untuk akun murid/guru.',
    colSpan: 'half'
  }
]

// ---- Fitur akun ----
const akunResult = ref<AkunMurid | null>(null)
const akunMode = ref<'buat' | 'lihat' | 'reset' | null>(null)
const genError = ref<string | null>(null)
const copied = ref(false)

const rowActions: CrudRowAction[] = [
  {
    icon: KeyRound,
    title: 'Buat Akun',
    cls: 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
    show: (item: any) => !item.email,
    onClick: async (item: any) => {
      genError.value = null
      try {
        const res = await admin.akun.generate(item.id)
        akunResult.value = res
        akunMode.value = 'buat'
        await crudRef.value?.load()
      } catch (e: any) {
        genError.value = e?.data?.message ?? 'Gagal membuat akun.'
      }
    }
  },
  {
    icon: Eye,
    title: 'Lihat Password',
    cls: 'text-gray-400 hover:text-violet-600 hover:bg-violet-50',
    show: (item: any) => !!item.email,
    onClick: async (item: any) => {
      genError.value = null
      try {
        const res = await admin.akun.lihatPassword(item.id)
        akunResult.value = res
        akunMode.value = 'lihat'
      } catch (e: any) {
        genError.value = e?.data?.message ?? 'Gagal memuat password.'
      }
    }
  },
  {
    icon: RefreshCw,
    title: 'Reset Password',
    cls: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
    show: (item: any) => !!item.email,
    onClick: async (item: any) => {
      // Password lama langsung tidak berlaku & tidak bisa dikembalikan
      if (!confirm('Reset password akun ini? Password lama akan langsung tidak berlaku.')) return
      genError.value = null
      try {
        const res = await admin.akun.resetPassword(item.id)
        akunResult.value = res
        akunMode.value = 'reset'
        await crudRef.value?.load()
      } catch (e: any) {
        genError.value = e?.data?.message ?? 'Gagal reset password.'
      }
    }
  }
]

function closeAkunModal() {
  akunResult.value = null
  akunMode.value = null
  genError.value = null
  copied.value = false
}

async function copyAkun() {
  if (!akunResult.value) return
  const text = `Nama: ${akunResult.value.nama}\nEmail: ${akunResult.value.email}\nPassword: ${akunResult.value.password}`
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback untuk konteks non-HTTPS (LAN HTTP) — textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard tidak tersedia — biarkan user menyalin manual
  }
}
</script>

<template>
  <div>
    <MasterDataCrud
      ref="crudRef"
      resource="users"
      title="Pengaturan Akun"
      description="Kelola akun pengguna. Tombol aksi: Buat Akun (generate email & password), Lihat Password (tanpa reset), dan Reset Password."
      :columns="columns"
      :fields="fields"
      :option-loaders="optionLoaders"
      :row-actions="rowActions"
      :search-keys="['name', 'email', 'kelas']"
      search-placeholder="Cari nama, email, atau kelas…"
      :delete-label="(item: any) => `user ${item.name ?? item.email}`"
    />

    <!-- Modal hasil generate / lihat / reset password -->
    <div
      v-if="akunResult"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAkunModal" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound class="w-5 h-5 text-emerald-600" />
            {{ akunMode === 'buat' ? 'Akun Berhasil Dibuat' : akunMode === 'reset' ? 'Password Di-reset' : 'Lihat Password' }}
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="closeAkunModal">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-3">
          <p
            class="text-sm rounded-lg px-3 py-2 border"
            :class="akunMode === 'reset' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-amber-700 bg-amber-50 border-amber-200'"
          >
            <strong>{{ akunMode === 'reset' ? 'Password baru:' : akunMode === 'lihat' ? 'Password saat ini:' : 'Catatan:' }}</strong>
            {{ akunMode === 'reset'
              ? 'Password lama sudah tidak berlaku. Password baru hanya ditampilkan sekali ini — simpan & bagikan ke pengguna.'
              : akunMode === 'lihat'
                ? 'Password ini disimpan sementara khusus admin. Simpan & bagikan ke pengguna.'
                : 'Password hanya ditampilkan sekali ini. Simpan & bagikan ke pengguna.' }}
          </p>

          <div class="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs font-medium text-gray-500 uppercase">Nama</span>
              <span class="text-sm font-semibold text-gray-900">{{ akunResult.nama }}</span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs font-medium text-gray-500 uppercase">Email</span>
              <span class="text-sm font-semibold font-mono text-gray-900">{{ akunResult.email }}</span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs font-medium text-gray-500 uppercase">Password</span>
              <span class="text-sm font-semibold font-mono text-gray-900">{{ akunResult.password }}</span>
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              @click="copyAkun"
            >
              <Copy v-if="!copied" class="w-4 h-4" />
              <Check v-else class="w-4 h-4" />
              {{ copied ? 'Tersalin!' : 'Salin Akun' }}
            </button>
            <button
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
              @click="closeAkunModal"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="genError && !akunResult" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mt-4">
      {{ genError }}
    </p>
  </div>
</template>
