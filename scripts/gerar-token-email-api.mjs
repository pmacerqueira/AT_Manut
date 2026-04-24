/**
 * Gera um segredo forte e cria (ou actualiza) ficheiros LOCAIS que NÃO vão para o Git:
 *   - servidor-cpanel/api/atm_report_auth.secret.php  → enviar para public_html/api/ no servidor
 *   - .env.local → VITE_ATM_REPORT_AUTH_TOKEN (usado pelo Vite em npm run build)
 *
 * Uso: na pasta AT_Manut → npm run gen:report-auth
 */
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const token = randomBytes(32).toString('hex')

const secretPhp = join(root, 'servidor-cpanel', 'api', 'atm_report_auth.secret.php')
const secretBody = `<?php
declare(strict_types=1);
/**
 * Segredo para email / relatório / log-receiver — gerado por npm run gen:report-auth
 * NUNCA commitar este ficheiro (está no .gitignore).
 */
putenv('ATM_REPORT_AUTH_TOKEN=${token}');
`
writeFileSync(secretPhp, secretBody, 'utf8')

const envLocal = join(root, '.env.local')
let envText = ''
if (existsSync(envLocal)) {
  envText = readFileSync(envLocal, 'utf8')
}
const key = 'VITE_ATM_REPORT_AUTH_TOKEN'
const line = `${key}=${token}`
if (new RegExp(`^${key}=`, 'm').test(envText)) {
  envText = envText.replace(new RegExp(`^${key}=.*$`, 'm'), line)
} else {
  envText = envText.replace(/\s*$/, '')
  envText += (envText && !envText.endsWith('\n') ? '\n' : '') + '\n# Token partilhado com ATM_REPORT_AUTH_TOKEN no servidor (npm run gen:report-auth)\n' + line + '\n'
}
writeFileSync(envLocal, envText, 'utf8')

console.log(`
✅ Token gerado (64 caracteres hex). Ficheiros actualizados apenas na tua máquina:

   • ${secretPhp}
   • ${envLocal}

Próximos passos (uma vez):
   1) Envia atm_report_auth.secret.php para o servidor: public_html/api/
      (ou usa deploy no repo navel-site — ver docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md)
   2) Envia atm_report_auth.php e .htaccess actualizados se ainda não estiverem no servidor
   3) cd AT_Manut && npm run build
   4) cd navel-site && npm run deploy:at-manut -- --yes

Não copies o token para chats nem para ficheiros versionados no Git.
`)
