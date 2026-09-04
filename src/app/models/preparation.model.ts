/**
 * Algo que se prepara aparte y después se consume por partes: una masa, un té
 * infusionado, perlas de tapioca cocidas, una salsa.
 *
 * Generaliza a la antigua `Dough`, que era el único compuesto del modelo y
 * estaba atada a la pizza: una sola por precio, con porcentajes calculados
 * sobre la harina y consumida entera en bolas.
 *
 * La pieza que faltaba es el rendimiento. Un lote no siempre pesa lo que pesan
 * sus ingredientes: 100 g de tapioca seca dan 250 g cocida, y una salsa que se
 * reduce pierde. Sin declararlo, cobrar 60 g de perlas cocidas contra el costo
 * del grano seco sobrecostea dos veces y media.
 *
 * Vive en la colección `doughs` a propósito: renombrarla obligaría a migrar
 * todos los precios que la referencian, y el nombre de la colección no se ve
 * desde ninguna pantalla.
 */
export interface PreparationIngredient {
  supplyId: string;
  /** Cantidad para el lote entero, en la unidad base del insumo. */
  quantity: number;
}

/** Cuánto se consume de una preparación en una unidad de producto. */
export interface PreparationConsumption {
  preparationId: string;
  quantity: number;
}

export interface Preparation {
  id?: string;
  name: string;
  ingredients: PreparationIngredient[];
  /**
   * Lo que rinde el lote. Sin declarar se asume que rinde lo que suman sus
   * ingredientes, que es como se comportaban las masas.
   */
  yieldQuantity?: number;
  /** Unidad en la que se mide lo que rinde y lo que se consume. */
  yieldUnitId?: string;
  /** Cuánto consume una unidad por defecto. En las masas, el peso de bola. */
  defaultQuantity?: number;
  /** Forma vieja de `defaultQuantity`, de cuando toda preparación era una masa. */
  ballWeight?: number;
}

/** Lo que suman los ingredientes del lote: el rendimiento por defecto. */
export function ingredientsTotal(preparation: Preparation): number {
  return preparation.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0);
}

/**
 * Lo que rinde el lote. Sin rendimiento declarado son los ingredientes en
 * crudo, que es exactamente lo que hacían las masas: una bola de 250 g salía
 * de repartir 250 sobre el total de la receta.
 */
export function yieldOf(preparation: Preparation): number {
  return preparation.yieldQuantity && preparation.yieldQuantity > 0
    ? preparation.yieldQuantity
    : ingredientsTotal(preparation);
}

export function defaultQuantityOf(preparation: Preparation): number {
  return preparation.defaultQuantity ?? preparation.ballWeight ?? 0;
}

/**
 * Cuánto insumo hace falta para consumir `quantity` de la preparación.
 *
 * El rendimiento es el que traduce: si el lote rinde 250 g cocidos a partir de
 * 100 g secos, consumir 60 g cocidos gasta 24 g de grano seco, y es ese grano
 * el que tiene precio de compra.
 */
export function scaledIngredients(
  preparation: Preparation,
  quantity: number
): PreparationIngredient[] {
  const total = yieldOf(preparation);
  if (total <= 0 || quantity <= 0) return [];

  const factor = quantity / total;

  return preparation.ingredients.map(ingredient => ({
    supplyId: ingredient.supplyId,
    quantity: ingredient.quantity * factor
  }));
}
