export interface PackagingItem {
  supplyId: string;
  quantity: number;
}

export interface Packaging {
  id?: string;
  recipeTypeId: string;
  items: PackagingItem[];
}
