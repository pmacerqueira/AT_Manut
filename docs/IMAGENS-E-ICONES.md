# Imagens e Ícones — AT_Manut

Regras e procedimentos para gestão de imagens no projeto, garantindo tamanhos mínimos e carregamento rápido em qualquer dispositivo.

---

## Regra obrigatória

**Todas as imagens adicionadas ao projeto devem ser otimizadas** antes do commit e do build. O script `optimize-images` é executado automaticamente antes de cada build.

---

## Script de otimização

### Execução

```bash
# Otimizar manualmente (ex.: após adicionar novas imagens)
npm run optimize-images

# O prebuild executa automaticamente antes do build
npm run build
```

### O que o script faz

| Formato | Acção |
|---------|-------|
| **PNG** | Redimensiona (se configurado), comprime com nível 9 |
| **JPG/JPEG** | Comprime com qualidade 85 (mozjpeg) |
| **WebP** | Comprime com qualidade 85 |
| **SVG** | Minifica com SVGO (remove metadados, espaços, atributos redundantes) |
| **GIF** | Não otimizado automaticamente |

### Pastas analisadas

- `public/` (e subpastas)
- `src/assets/` (e subpastas)

---

## Adicionar novas imagens

### 1. Colocar o ficheiro

Coloque a imagem em `public/` ou `src/assets/` (ou subpastas).

### 2. Configurar dimensões (PNG)

Se a imagem PNG precisar de redimensionamento (ex.: ícones PWA), adicione em `scripts/optimize-images.js`:

```js
const DIMENSIONS = {
  'icon-192.png': { w: 192, h: 192 },
  'icon-512.png': { w: 512, h: 512 },
  'logo.png': { w: 512, h: 512 },
  'logo-navel.png': null,  // manter dimensões, só comprimir
  'minha-nova-imagem.png': { w: 256, h: 256 },  // ← adicionar
}
```

- `{ w: X, h: Y }` — redimensiona para X×Y pixels
- `null` — mantém dimensões, apenas comprime

### 3. Executar otimização

```bash
npm run optimize-images
```

### 4. Verificar

Confirme que a imagem mantém qualidade aceitável e que o tamanho em disco diminuiu.

---

## Dimensões recomendadas

| Uso | Dimensões | Formato |
|-----|-----------|---------|
| Ícone PWA 192 | 192×192 | PNG |
| Ícone PWA 512 | 512×512 | PNG |
| Logo sidebar | 512×512 ou menor | PNG |
| Logo login (Navel) | manter proporção original | PNG |
| Favicon | 192×192 ou 512×512 | PNG |
| Ilustrações / fotos | máximo 1200px no lado maior | JPG/WebP |

---

## Ficheiros atuais do projeto

| Ficheiro | Localização | Dimensões | Tamanho aprox. |
|----------|-------------|-----------|----------------|
| icon-192.png | public/ | 192×192 | ~30 KB |
| icon-512.png | public/ | 512×512 | ~230 KB |
| logo.png | public/ | 512×512 | ~230 KB |
| logo-navel.png | public/ | 525×124 | ~82 KB |
| vite.svg | public/ | — | ~1 KB |
| react.svg | src/assets/ | — | ~4 KB |

---

## Dependências

- **sharp** — processamento de PNG, JPG, WebP
- **svgo** — otimização de SVG

Instaladas como `devDependencies` no projeto.
