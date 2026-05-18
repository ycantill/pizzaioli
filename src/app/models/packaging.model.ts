export interface PackagingItem {
  costId: string;
  quantity: number;
}

export interface Packaging {
  id?: string;
  recipeTypeId: string;
  items: PackagingItem[];
}
