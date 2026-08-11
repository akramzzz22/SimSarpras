import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireAuth } from '../utils/auth'
import { validationError } from '../utils/helpers'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const parts = await readMultipartFormData(event).catch(() => null)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)

  if (!file || !file.data?.length) {
    throw validationError('File gambar wajib diunggah.', { file: ['File gambar wajib diunggah.'] })
  }
  const mime = String(file.type ?? '')
  const ext = MIME_EXT[mime] ?? ''
  if (!ext) {
    throw validationError('File harus berupa gambar (jpg, png, webp).', { file: ['File harus berupa gambar (jpg, png, webp).'] })
  }
  if (file.data.length > 5 * 1024 * 1024) {
    throw validationError('Ukuran maksimal 5MB.', { file: ['Ukuran maksimal 5MB.'] })
  }

  const dir = resolve(process.cwd(), 'public', 'storage', 'uploads')
  mkdirSync(dir, { recursive: true })
  const filename = `${randomBytes(16).toString('hex')}.${ext}`
  writeFileSync(resolve(dir, filename), file.data)

  return { url: `/storage/uploads/${filename}` }
})
