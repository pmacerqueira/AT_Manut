/**
 * Utilizadores da aplicação Navel Manutenções.
 * Passwords armazenadas em hash bcrypt (10 rounds) — nunca em texto claro.
 * Os nomes dos técnicos de serviço estão em TECNICOS (abaixo),
 * utilizados para identificar o autor de cada manutenção.
 */
export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
}

export const USERS = [
  {
    id: 'admin',
    username: 'Admin',
    nome: 'Administrador',
    role: ROLES.ADMIN,
    passwordHash: '$2b$10$YK4siN1Sxh2IiO1HSBqt1u/YhFNcwmjFqXEwMggFdY5l9WgNXgezK',
  },
  {
    id: 'atecnica',
    username: 'ATecnica',
    nome: 'Assistência Técnica',
    role: ROLES.TECNICO,
    passwordHash: '$2b$10$0zN/OJa0V13ARPGHl3YDBO/IrAj9Y1awEPmaWQmN8xrKw6JK55kDe',
  },
]

/** Técnicos de serviço — usados nas fichas de manutenção e relatórios */
export const TECNICOS = [
  'Aurélio Almeida',
  'Paulo Medeiros',
  'Aldevino Costa',
]
