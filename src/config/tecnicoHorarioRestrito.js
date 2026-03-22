/**
 * Horario restrito — perfil tecnico (ATecnica). Manter alinhado com
 * servidor-cpanel/api/tecnico_horario_restrito.json na API.
 * Dias: 0 domingo … 6 sabado. Se from > to, atravessa meia-noite.
 *
 * Regra actual: sábado e domingo (todo o dia); 2ª–6ª feira bloqueado das 18:00 às 07:30 (Açores).
 */
export const TECNICO_HORARIO_CONFIG = {
  enabled: true,
  timezone: 'Atlantic/Azores',
  blocks: [
    { days: [0, 6], from: '00:00', to: '23:59' },
    { days: [1, 2, 3, 4, 5], from: '18:00', to: '07:30' },
  ],
}
