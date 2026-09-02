import { Injectable } from '@angular/core';
import { Dough, DoughRecipeIngredient } from '../models/dough.model';
import { PricedItem } from '../models/priced-item.model';

export interface CalculatedIngredient {
  supplyId: string;
  name: string;
  quantity: number;
  bakerPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class DoughCalculationService {
  
  /**
   * Find the flour ingredient in a dough recipe
   */
  findFlourIngredient(dough: Dough, items: PricedItem[]): DoughRecipeIngredient | null {
    const flourIngredient = dough.ingredients.find(ing => {
      const item = items.find(i => i.id === ing.supplyId);
      return item?.name.toLowerCase().includes('harina');
    });
    return flourIngredient || null;
  }

  /**
   * Calculate baker's percentage for each ingredient based on flour weight
   */
  calculateBakerPercentages(
    dough: Dough,
    flourBaseWeight: number,
  ): Map<string, number> {
    const percentages = new Map<string, number>();
    
    dough.ingredients.forEach(ing => {
      const percentage = (ing.quantity / flourBaseWeight) * 100;
      percentages.set(ing.supplyId, percentage);
    });
    
    return percentages;
  }

  /**
   * Get baker's percentages for a dough (convenience method)
   */
  getDoughBakerPercentages(
    dough: Dough,
    items: PricedItem[]
  ): { supplyId: string; bakerPercentage: number }[] {
    const flourIngredient = this.findFlourIngredient(dough, items);
    if (!flourIngredient) return [];

    const percentages = this.calculateBakerPercentages(dough, flourIngredient.quantity);
    
    return dough.ingredients.map(ing => ({
      supplyId: ing.supplyId,
      bakerPercentage: Math.round((percentages.get(ing.supplyId) || 0) * 100) / 100
    }));
  }

  /**
   * Calculate actual ingredient quantities based on dough ball weight and quantity
   * Formula: 
   * 1. ingredientMultiplier = (quantity * doughBallWeight) / totalBakerPercentage
   * 2. ingredientQuantity = ingredientMultiplier * ingredientBakerPercentage
   */
  calculateIngredientQuantities(
    dough: Dough,
    doughBallWeight: number,
    quantity: number,
    items: PricedItem[]
  ): CalculatedIngredient[] {
    const flourIngredient = this.findFlourIngredient(dough, items);
    if (!flourIngredient) return [];

    const flourBaseWeight = flourIngredient.quantity;
    const percentages = this.calculateBakerPercentages(dough, flourBaseWeight);

    // Calculate total baker's percentage
    const totalBakerPercentage = Array.from(percentages.values()).reduce((sum, p) => sum + p, 0);

    // Calculate ingredient multiplier
    const ingredientMultiplier = (quantity * doughBallWeight) / totalBakerPercentage;

    return dough.ingredients.map(ing => {
      const item = items.find(i => i.id === ing.supplyId);
      const bakerPercentage = percentages.get(ing.supplyId) || 0;
      const actualQuantity = ingredientMultiplier * bakerPercentage;

      return {
        supplyId: ing.supplyId,
        name: item?.name || 'Desconocido',
        quantity: Math.round(actualQuantity * 10) / 10,
        bakerPercentage: Math.round(bakerPercentage * 100) / 100
      };
    });
  }
}
