export interface Price {
  id?: string;
  name: string;
  price: number;
  doughId?: string | null;
  recipeId?: string | null;
  ballWeight?: number;
  ajusteAuto?: boolean;
  ajusteValue?: number;
  targetMarginPercent?: number;
  additionToppingIds?: string[];
  removedIngredientIds?: string[];
}
