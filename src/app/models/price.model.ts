export interface Price {
  id?: string;
  name: string;
  price: number;
  doughId?: string | null;
  recipeId?: string | null;
  ballWeight?: number;
  additionToppingIds?: string[];
  removedIngredientIds?: string[];
}
