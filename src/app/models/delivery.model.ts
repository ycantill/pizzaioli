export interface DeliveryItem {
  costId: string;
  quantity: number;
}

export interface Delivery {
  id?: string;
  recipeTypeId: string;
  items: DeliveryItem[];
}
