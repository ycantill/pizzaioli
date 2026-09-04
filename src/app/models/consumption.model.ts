/**
 * Forma heredada: un ritmo de consumo con nombre propio, apuntando a una
 * tarifa. Hoy ese ritmo vive dentro de la propia tarifa (`quantityPerHour`) y
 * este modelo solo se usa para leer lo guardado antes del cambio.
 */
export interface Consumption {
  id?: string;
  name: string;
  rateId: string;
  quantity: number;
}
