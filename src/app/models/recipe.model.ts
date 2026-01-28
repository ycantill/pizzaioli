export interface RecipeIngredient {
  costId: string;
  quantity: number;
}

export interface Recipe {
  id?: string;
  name: string;
  recipeTypeId: string;
  ingredients: RecipeIngredient[];
}
