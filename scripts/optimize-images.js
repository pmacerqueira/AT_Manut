/**
 * Otimiza todas as imagens e ícones do projeto AT_Manut.
 * Reduz tamanho em disco e acelera o carregamento em qualquer dispositivo.
 *
 * Executar: npm run optimize-images
 * Ou antes do build: npm run optimize-images && npm run build
 *
 * Regras aplicadas:
 * - PNG: redimensiona ao tamanho alvo (se configurado), comprime com nível 9
 * - JPG/JPEG: comprime com qualidade 85
 * - WebP: comprime com qualidade 85
 * - SVG: minifica com SVGO (remove metadados, espaços, atributos redundantes)
 */

import sharp from 'sharp'
import { optimize as optimizeSvg } from 'svgo'
import { readdir, stat, readFile, writeFile, rename } from 'fs/promises'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Pastas onde procurar imagens (relativas à raiz do projeto)
const IMAGE_DIRS = ['public', 'src/assets']

// Configuração por ficheiro: dimensões alvo (null = manter, só comprimir)
const DIMENSIONS = {
  'icon-192.png': { w: 192, h: 192 },
  'icon-512.png': { w: 512, h: 512 },
  'logo.png': { w: 512, h: 512 },
  'logo-navel.png': null, // manter dimensões
}

async function findImages(dir, base = '') {
  const images = []
  const fullPath = base ? join(ROOT, base, dir) : join(ROOT, dir)
  try {
    const entries = await readdir(fullPath, { withFileTypes: true })
    for (const e of entries) {
      const relPath = base ? join(base, dir, e.name) : join(dir, e.name)
      if (e.isDirectory()) {
        images.push(...(await findImages(e.name, base ? join(base, dir) : dir)))
      } else if (e.isFile()) {
        const ext = extname(e.name).toLowerCase()
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
          images.push(join(ROOT, relPath))
        }
      }
    }
  } catch {
    // pasta pode não existir
  }
  return images
}

async function findAllImages() {
  const all = []
  for (const dir of IMAGE_DIRS) {
    all.push(...(await findImages(dir)))
  }
  return all
}

async function optimizePng(path, dims) {
  const before = (await stat(path)).size
  const tmpPath = path + '.opt'
  let pipeline = sharp(path)

  if (dims?.w && dims?.h) {
    pipeline = pipeline.resize(dims.w, dims.h)
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(tmpPath)
  const after = (await stat(tmpPath)).size
  await rename(tmpPath, path)
  return { before, after }
}

async function optimizeJpeg(path) {
  const before = (await stat(path)).size
  const tmpPath = path + '.opt'
  await sharp(path)
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(tmpPath)
  const after = (await stat(tmpPath)).size
  await rename(tmpPath, path)
  return { before, after }
}

async function optimizeWebp(path) {
  const before = (await stat(path)).size
  const tmpPath = path + '.opt'
  await sharp(path)
    .webp({ quality: 85 })
    .toFile(tmpPath)
  const after = (await stat(tmpPath)).size
  await rename(tmpPath, path)
  return { before, after }
}

async function optimizeSvgFile(path) {
  const before = (await stat(path)).size
  const content = await readFile(path, 'utf-8')
  const result = optimizeSvg(content, {
    multipass: true,
    plugins: ['preset-default'],
  })
  await writeFile(path, result.data)
  const after = (await stat(path)).size
  return { before, after }
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(1)
}

async function main() {
  const images = await findAllImages()
  if (images.length === 0) {
    console.log('Nenhuma imagem encontrada.')
    return
  }

  let totalBefore = 0
  let totalAfter = 0

  for (const path of images) {
    const name = path.replace(ROOT + '\\', '').replace(ROOT + '/', '')
    const ext = extname(path).toLowerCase()
    const baseName = path.split(/[/\\]/).pop()

    try {
      if (ext === '.svg') {
        const { before, after } = await optimizeSvgFile(path)
        totalBefore += before
        totalAfter += after
        const saved = before - after
        console.log(`${name}: ${formatKb(before)} KB → ${formatKb(after)} KB${saved > 0 ? ` (‑${formatKb(saved)} KB)` : ''}`)
      } else if (ext === '.png') {
        const dims = DIMENSIONS[baseName] ?? null
        const { before, after } = await optimizePng(path, dims)
        totalBefore += before
        totalAfter += after
        const saved = before - after
        console.log(`${name}: ${formatKb(before)} KB → ${formatKb(after)} KB${saved > 0 ? ` (‑${formatKb(saved)} KB)` : ''}`)
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        const { before, after } = await optimizeJpeg(path)
        totalBefore += before
        totalAfter += after
        const saved = before - after
        console.log(`${name}: ${formatKb(before)} KB → ${formatKb(after)} KB${saved > 0 ? ` (‑${formatKb(saved)} KB)` : ''}`)
      } else if (ext === '.webp') {
        const { before, after } = await optimizeWebp(path)
        totalBefore += before
        totalAfter += after
        const saved = before - after
        console.log(`${name}: ${formatKb(before)} KB → ${formatKb(after)} KB${saved > 0 ? ` (‑${formatKb(saved)} KB)` : ''}`)
      } else if (ext === '.gif') {
        // sharp pode converter gif; por simplicidade, saltar (ou adicionar lógica)
        console.log(`${name}: (gif — não otimizado automaticamente)`)
      }
    } catch (err) {
      console.error(`${name}: erro — ${err.message}`)
    }
  }

  const saved = totalBefore - totalAfter
  if (totalBefore > 0) {
    console.log('')
    console.log(`Total: ${formatKb(totalBefore)} KB → ${formatKb(totalAfter)} KB (‑${formatKb(saved)} KB)`)
  }
}

main()
