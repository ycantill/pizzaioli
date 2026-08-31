export type ToppingSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const TOPPING_SIZES: ToppingSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export interface Topping {
  id?: string;
  supplyId: string;
  quantity: number;
  size: ToppingSize;
  salsaBase: boolean;
}
