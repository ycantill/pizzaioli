export interface RecipeIngredient {
  supplyId: string;
  quantity: number;
}

export interface Recipe {
  id?: string;
  name: string;
  isDough: boolean;
  ingredients: RecipeIngredient[];
}
