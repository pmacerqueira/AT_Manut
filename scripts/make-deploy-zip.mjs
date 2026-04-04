/**
 * Cria dist_upload.zip com o conteúdo de dist/ na raíz do arquivo
 * (extrair directamente em public_html/manut — sem subpasta extra).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const distDir = path.join(root, 'dist')
const zipPath = path.join(root, 'dist_upload.zip')

if (!fs.existsSync(distDir)) {
  console.error('dist/ não existe. Execute npm run build primeiro.')
  process.exit(1)
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
}

await new Promise((resolve, reject) => {
  const out = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  out.on('close', () => {
    console.log(
      `dist_upload.zip (${archive.pointer()} bytes) — raiz = ficheiros de dist/ (extrair em public_html/manut/)`,
    )
    resolve()
  })
  archive.on('error', reject)
  archive.pipe(out)

  archive.glob('**/*', {
    cwd: distDir,
    dot: true,
    nodir: true,
  })

  archive.finalize()
})
