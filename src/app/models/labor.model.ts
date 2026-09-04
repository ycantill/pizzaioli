export interface LaborItem {
  /** La tarifa que se consume: gas, energía, mano de obra. */
  rateId?: string;
  /**
   * Forma vieja: apuntaba a un `consumption`, que a su vez apuntaba a la
   * tarifa. Se sigue leyendo para no romper lo ya configurado; al volver a
   * guardar la configuración desaparece. Ver `resolveLaborItem`.
   */
  consumptionId?: string;
  /** Minutos de la tanda entera, no de una unidad. */
  minutes: number;
  /**
   * Cuántas unidades salen de esa tanda.
   *
   * El horno hornea cuatro pizzas en los mismos ocho minutos, así que el gas
   * se reparte entre las cuatro. Sin definir vale 1 —una tanda por unidad—,
   * que es como se calculaba antes de que existiera este campo.
   */
  batchSize?: number;
}

export interface Labor {
  id?: string;
  recipeTypeId: string;
  /** El tamaño al que aplica: una familiar ocupa más horno. Sin declarar, todos. */
  sizeId?: string;
  items: LaborItem[];
}

/** Una tanda siempre rinde al menos una unidad; 0 o vacío se lee como 1. */
export function batchSizeOf(item: LaborItem): number {
  return item.batchSize && item.batchSize > 0 ? item.batchSize : 1;
}

/** Minutos que le tocan a una unidad, que es lo que se cobra en el precio. */
export function minutesPerUnit(item: LaborItem): number {
  return item.minutes / batchSizeOf(item);
}
