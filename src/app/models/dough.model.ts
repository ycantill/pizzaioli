export interface DoughRecipeIngredient {
  supplyId: string;
  quantity: number;
}

export interface Dough {
  id?: string;
  name: string;
  ingredients: DoughRecipeIngredient[];
}

export interface DoughIngredient {
  id?: string;
  supplyId: string;
  bakerPercentage: number;
  calculatedWeight?: number;
}

export interface DoughCalculation {
  weightPerUnit: number;
  quantity: number;
  ingredients: DoughIngredient[];
  totalWeight?: number;
}
