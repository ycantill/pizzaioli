export interface DoughRecipeIngredient {
  costId: string;
  quantity: number;
}

export interface Dough {
  id?: string;
  name: string;
  ingredients: DoughRecipeIngredient[];
  ballWeight: number;
}

export interface DoughIngredient {
  id?: string;
  costId: string;
  bakerPercentage: number;
  calculatedWeight?: number;
}

export interface DoughCalculation {
  weightPerUnit: number;
  quantity: number;
  ingredients: DoughIngredient[];
  totalWeight?: number;
}
