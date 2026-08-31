import { MarginConfig } from './margin-config.model';

/**
 * Tarifa no inventariable: servicios (luz, gas, agua) y mano de obra.
 * No tiene stock; su valor se mantiene a mano.
 */
export interface Rate {
  id?: string;
  name: string;
  unitId: string;
  value: number;
  margin: MarginConfig;
}
