export type ToppingSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const TOPPING_SIZES: ToppingSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export interface Topping {
  id?: string;
  supplyId: string;
  /** Cantidad para el tamaño base. Los demás la escalan si `scalesWithSize`. */
  quantity: number;
  /**
   * Si el tamaño lo arrastra. Se declara topping por topping porque no todo
   * escala igual: el té crece con el vaso, pero el queso de una familiar no
   * crece como su masa, y la salsa a veces ni se mueve.
   *
   * Sin declarar no escala: así lo ya cargado sigue costando lo mismo.
   */
  scalesWithSize?: boolean;
  /** Forma vieja: un documento por cada tamaño. Hoy solo rotula la línea. */
  size: ToppingSize;
  salsaBase: boolean;
}

/** Lo que lleva un topping en un tamaño dado. */
export function toppingQuantity(topping: Topping, factor: number): number {
  return topping.scalesWithSize ? topping.quantity * factor : topping.quantity;
}
