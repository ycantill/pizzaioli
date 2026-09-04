import { Consumption } from '../models/consumption.model';
import { batchSizeOf, LaborItem } from '../models/labor.model';
import { quantityPerHourOf, Rate } from '../models/rate.model';

export interface ResolvedLaborItem {
  rateId: string;
  /** Cómo se llama la línea en el precio. */
  name: string;
  quantityPerHour: number;
  /** Minutos de la tanda entera. */
  minutes: number;
  batchSize: number;
}

/**
 * Traduce una línea de mano de obra a la tarifa que consume.
 *
 * Acepta las dos formas: la actual, que apunta a la tarifa, y la vieja, que
 * apuntaba a un `consumption` intermedio. Es el mismo apaño que `inferCategoryKind`
 * hace con las categorías sin `kind`, y se puede borrar —junto con la colección
 * `consumptions`— en cuanto todas las configuraciones se hayan vuelto a guardar.
 */
export function resolveLaborItem(
  item: LaborItem,
  rates: Rate[],
  legacyConsumptions: Consumption[]
): ResolvedLaborItem | undefined {
  const batchSize = batchSizeOf(item);

  if (item.rateId) {
    const rate = rates.find(r => r.id === item.rateId);
    if (!rate) return undefined;

    return {
      rateId: rate.id!,
      name: rate.name,
      quantityPerHour: quantityPerHourOf(rate),
      minutes: item.minutes,
      batchSize
    };
  }

  if (item.consumptionId) {
    const consumption = legacyConsumptions.find(c => c.id === item.consumptionId);
    if (!consumption) return undefined;

    const rate = rates.find(r => r.id === consumption.rateId);
    if (!rate) return undefined;

    return {
      // El consumo viejo tenía su propio nombre ("Horno"), más descriptivo que
      // el de la tarifa ("Gas"): se conserva hasta que se vuelva a guardar.
      rateId: rate.id!,
      name: consumption.name,
      quantityPerHour: consumption.quantity,
      minutes: item.minutes,
      batchSize
    };
  }

  return undefined;
}
