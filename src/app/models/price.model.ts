import { PreparationConsumption } from './preparation.model';

export interface Price {
  id?: string;
  name: string;
  price: number;
  /**
   * Las preparaciones que lleva una unidad: la masa de una pizza, el té y las
   * perlas de un vaso. Antes solo cabía una, y era siempre una masa.
   */
  preparations?: PreparationConsumption[];
  /** Forma vieja: una sola masa y su peso de bola. Ver `specOf`. */
  doughId?: string | null;
  ballWeight?: number;
  recipeId?: string | null;
  /** El tamaño que se cotizó. Sin declarar, el base. */
  sizeId?: string | null;
  additionToppingIds?: string[];
  removedIngredientIds?: string[];
}

/**
 * Las preparaciones de un precio, sea cual sea la forma en la que se guardó.
 * Al volver a guardarlo queda en la forma nueva y la vieja desaparece.
 */
export function preparationsOf(price: Price): PreparationConsumption[] {
  if (price.preparations?.length) return price.preparations;

  if (price.doughId && price.ballWeight) {
    return [{ preparationId: price.doughId, quantity: price.ballWeight }];
  }

  return [];
}
