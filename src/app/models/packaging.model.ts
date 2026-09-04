export interface PackagingItem {
  supplyId: string;
  quantity: number;
}

export interface Packaging {
  id?: string;
  recipeTypeId: string;
  /**
   * El tamaño al que aplica. Sin declarar vale para todos, que es como estaba
   * antes de que existieran los tamaños: una caja para toda la pizzería.
   */
  sizeId?: string;
  items: PackagingItem[];
}
