export interface Price {
  id?: string;
  name: string;
  price: number;
  doughId?: string | null;
  recipeId?: string | null;
  ballWeight?: number;
  ajuste?: number;
  ajusteDescription?: string;
  additionToppingIds?: string[];
}
