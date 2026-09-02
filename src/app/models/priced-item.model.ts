import { MarginConfig } from './margin-config.model';

/**
 * Lo único que el cálculo de precios necesita de un insumo o una tarifa.
 *
 * Supply y Rate se proyectan a este tipo, de modo que el pricing no tiene que
 * saber cuál de los dos está usando: un ingrediente, una caja y el kilovatio
 * se cotizan igual.
 */
export interface PricedItem {
  id: string;
  name: string;
  unitId: string;
  unitCost: number;
  margin: MarginConfig;
}
