import { MarginConfig } from './margin-config.model';

/**
 * Tarifa no inventariable: servicios (luz, gas, agua) y mano de obra.
 * No tiene stock; su valor se mantiene a mano.
 *
 * También sabe a qué ritmo se consume, que antes vivía en una colección
 * aparte (`consumptions`): el gas cuesta $X el metro cúbico y el horno gasta
 * dos por hora. Eran dos pantallas para una sola idea, y la del medio no la
 * usaba nadie más que la mano de obra.
 */
export interface Rate {
  id?: string;
  name: string;
  unitId: string;
  value: number;
  /** Unidades que se consumen por hora de uso. Sin definir, una. */
  quantityPerHour?: number;
  margin: MarginConfig;
}

export function quantityPerHourOf(rate: Rate | undefined): number {
  if (!rate) return 1;
  return rate.quantityPerHour && rate.quantityPerHour > 0 ? rate.quantityPerHour : 1;
}
