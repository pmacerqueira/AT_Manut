/**
 * Horário restrito — perfil técnico (ATecnica), espelhado no browser pelo `TecnicoHorarioGuard`.
 *
 * IMPORTANTE: o valor efectivo na API é `servidor-cpanel/api/tecnico_horario_restrito.json`
 * (ou omissão desse ficheiro ⇒ horário **desactivado** no servidor).
 * Se `enabled: true` aqui e **não** houver JSON equivalente no servidor, o técnico consegue
 * login e dados na API mas o guard **expulsa** a sessão ao fim de segundos (sintoma: “entra e volta ao login”).
 *
 * Por defeito `enabled: false` — activar aqui **só** quando o JSON no servidor tiver `"enabled": true`
 * e os blocos forem os mesmos.
 *
 * Expediente permitido (quando activo): **dias úteis 08:00–18:00** (Atlantic/Azores); **sábado e domingo** fechado.
 * Bloco nocturno: 18:00→07:59 (atravessa meia-noite) — em PHP, `to` inclusivo;
 * usar 07:59 para o expediente **começar às 08:00**.
 */
export const TECNICO_HORARIO_CONFIG = {
  enabled: false,
  timezone: 'Atlantic/Azores',
  blocks: [
    { days: [0, 6], from: '00:00', to: '23:59' },
    { days: [1, 2, 3, 4, 5], from: '18:00', to: '07:59' },
  ],
}

/** Mensagem única para toast / reforço no login (deve reflectir os blocos acima). */
export const TECNICO_HORARIO_EXPEDIENTE_TOAST =
  'Horário de expediente da equipa técnica: dias úteis, 08:00 às 18:00 (hora dos Açores). Fins de semana sem acesso à aplicação.'
