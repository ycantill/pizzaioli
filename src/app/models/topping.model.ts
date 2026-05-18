export type ToppingSize = 'S' | 'M' | 'L' | 'XL';

export const TOPPING_SIZES: ToppingSize[] = ['S', 'M', 'L', 'XL'];

export interface Topping {
  id?: string;
  costId: string;
  quantity: number;
  size: ToppingSize;
}
