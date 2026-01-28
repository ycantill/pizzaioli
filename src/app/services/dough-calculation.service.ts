import { Injectable } from '@angular/core';
import { Dough, DoughRecipeIngredient } from '../models/dough.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';

export interface CalculatedIngredient {
  costId: string;
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
  findFlourIngredient(dough: Dough, costs: Cost[]): DoughRecipeIngredient | null {
    const flourIngredient = dough.ingredients.find(ing => {
      const cost = costs.find(c => c.id === ing.costId);
      return cost?.product.toLowerCase().includes('harina');
    });
    return flourIngredient || null;
  }

  /**
   * Calculate baker's percentage for each ingredient based on flour weight
   */
  calculateBakerPercentages(
    dough: Dough,
    flourBaseWeight: number,
    costs: Cost[]
  ): Map<string, number> {
    const percentages = new Map<string, number>();
    
    dough.ingredients.forEach(ing => {
      const percentage = (ing.quantity / flourBaseWeight) * 100;
      percentages.set(ing.costId, percentage);
    });
    
    return percentages;
  }

  /**
   * Get baker's percentages for a dough (convenience method)
   */
  getDoughBakerPercentages(
    dough: Dough,
    costs: Cost[]
  ): Array<{ costId: string; bakerPercentage: number }> {
    const flourIngredient = this.findFlourIngredient(dough, costs);
    if (!flourIngredient) return [];

    const percentages = this.calculateBakerPercentages(dough, flourIngredient.quantity, costs);
    
    return dough.ingredients.map(ing => ({
      costId: ing.costId,
      bakerPercentage: Math.round((percentages.get(ing.costId) || 0) * 100) / 100
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
    costs: Cost[]
  ): CalculatedIngredient[] {
    const flourIngredient = this.findFlourIngredient(dough, costs);
    if (!flourIngredient) return [];

    const flourBaseWeight = flourIngredient.quantity;
    const percentages = this.calculateBakerPercentages(dough, flourBaseWeight, costs);

    // Calculate total baker's percentage
    const totalBakerPercentage = Array.from(percentages.values()).reduce((sum, p) => sum + p, 0);

    // Calculate ingredient multiplier
    const ingredientMultiplier = (quantity * doughBallWeight) / totalBakerPercentage;

    return dough.ingredients.map(ing => {
      const cost = costs.find(c => c.id === ing.costId);
      const bakerPercentage = percentages.get(ing.costId) || 0;
      const actualQuantity = ingredientMultiplier * bakerPercentage;

      return {
        costId: ing.costId,
        name: cost?.product || 'Desconocido',
        quantity: Math.round(actualQuantity * 10) / 10,
        bakerPercentage: Math.round(bakerPercentage * 100) / 100
      };
    });
  }

  /**
   * Convert quantity to the base unit (grams/ml) based on cost unit
   */
  getConversionFactor(unitId: string, units: Unit[]): number {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return 1000; // default to kg

    const abbr = unit.abbreviation.toLowerCase();
    
    // Weight conversions to grams
    if (abbr === 'kg') return 1000;
    if (abbr === 'g') return 1;
    if (abbr === 'mg') return 0.001;
    
    // Volume conversions to ml
    if (abbr === 'l') return 1000;
    if (abbr === 'ml') return 1;
    
    // Units (pieces)
    if (abbr === 'unidad' || abbr === 'ud' || abbr === 'pz') return 1;
    
    return 1000; // default
  }

  /**
   * Calculate the cost of ingredients
   */
  calculateIngredientCost(
    quantity: number,
    cost: Cost,
    units: Unit[]
  ): number {
    const conversionFactor = this.getConversionFactor(cost.unitId, units);
    return (quantity / conversionFactor) * cost.value;
  }
}
