/**
 * Roles e técnicos da aplicação Navel Manutenções.
 * Autenticação é feita via API (JWT) — ver AuthContext.jsx.
 */
export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
}

/** Técnicos de serviço — usados nas fichas de manutenção e relatórios */
export const TECNICOS = [
  'Aurélio Almeida',
  'Paulo Medeiros',
  'Aldevino Costa',
]
