/**
 * Roles e técnicos da aplicação Navel Manutenções.
 * Autenticação é feita via API (JWT) — ver AuthContext.jsx.
 */
export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
}

/**
 * @deprecated — Técnicos são agora geridos na BD (tabela `tecnicos`).
 * Esta constante serve apenas como fallback se a tabela ainda não existir.
 * Os componentes devem usar `tecnicos` do DataContext.
 */
export const TECNICOS_FALLBACK = [
  'Admin',
  'Aurélio Almeida',
  'Paulo Medeiros',
  'Aldevino Costa',
]
