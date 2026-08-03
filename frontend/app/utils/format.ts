export function formatTanggal(v?: string) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Badge status peminjaman: label + kelas warna Tailwind */
export const PINJAM_STATUS: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  disetujui: { label: 'Disetujui', cls: 'bg-blue-100 text-blue-700' },
  ditolak: { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' },
  dipinjam: { label: 'Dipinjam', cls: 'bg-violet-100 text-violet-700' },
  dikembalikan: { label: 'Dikembalikan', cls: 'bg-emerald-100 text-emerald-700' }
}

/** Badge status laporan kerusakan: label + kelas warna Tailwind */
export const LAPORAN_STATUS: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  diverifikasi: { label: 'Diverifikasi', cls: 'bg-blue-100 text-blue-700' },
  diperbaiki: { label: 'Diperbaiki', cls: 'bg-violet-100 text-violet-700' },
  selesai: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' }
}
