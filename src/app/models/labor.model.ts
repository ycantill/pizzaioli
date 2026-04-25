export interface LaborItem {
  consumptionId: string;
  minutes: number;
}

export interface Labor {
  id?: string;
  recipeTypeId: string;
  items: LaborItem[];
}
