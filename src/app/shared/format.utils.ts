/**
 * Tiempo en horas y minutos.
 *
 * Con tandas que rinden varias unidades los minutos por unidad dejan de ser
 * enteros —30 minutos entre 4 son 7,5—, así que se redondea al minuto: medio
 * minuto no cambia ninguna decisión y "7,5min" se lee peor que "8min".
 */
export function formatMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
}
