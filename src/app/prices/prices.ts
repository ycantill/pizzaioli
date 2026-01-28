import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { Dough } from '../models/dough.model';
import { Recipe } from '../models/recipe.model';
import { Cost } from '../models/cost.model';
import { Margin } from '../models/margin.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { DoughCalculationService } from '../services/dough-calculation.service';

interface IngredientCost {
  costId: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  margin: number;
}

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    FormsModule
  ],
  templateUrl: './prices.html',
  styleUrl: './prices.css'
})
export class Prices implements OnInit {
  private firestoreService = inject(FirestoreService);
  private doughCalcService = inject(DoughCalculationService);

  doughs = signal<Dough[]>([]);
  recipes = signal<Recipe[]>([]);
  costs = signal<Cost[]>([]);
  margins = signal<Margin[]>([]);
  units = signal<Unit[]>([]);

  selectedDoughId = signal<string | null>(null);
  selectedRecipeId = signal<string | null>(null);
  quantity = signal(1);
  doughBallWeight = signal(250);
  
  // Márgenes por ingrediente (Map de costId -> margin %)
  ingredientMargins = signal<Map<string, number>>(new Map());

  constructor() {
    // Actualizar peso del bollo cuando cambia la masa seleccionada
    effect(() => {
      const doughId = this.selectedDoughId();
      if (doughId) {
        const dough = this.doughs().find(d => d.id === doughId);
        if (dough) {
          this.doughBallWeight.set(dough.ballWeight);
        }
      }
    });
  }

  displayedColumns: string[] = ['ingredient', 'quantity', 'unitCost', 'totalCost', 'margin'];

  async ngOnInit() {
    await Promise.all([
      this.loadDoughs(),
      this.loadRecipes(),
      this.loadCosts(),
      this.loadMargins(),
      this.loadUnits()
    ]);
  }

  async loadDoughs() {
    try {
      const data = await this.firestoreService.getDocuments('doughs');
      this.doughs.set(data as Dough[]);
    } catch (error) {
      console.error('Error loading doughs:', error);
    }
  }

  async loadRecipes() {
    try {
      const data = await this.firestoreService.getDocuments('recipes');
      this.recipes.set(data as Recipe[]);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
    }
  }

  async loadMargins() {
    try {
      const data = await this.firestoreService.getDocuments('margins');
      this.margins.set(data as Margin[]);
      
      // Inicializar el Map de márgenes con los valores de la colección
      const marginsMap = new Map<string, number>();
      data.forEach((margin: any) => {
        const totalMargin = margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage;
        marginsMap.set(margin.costId, totalMargin);
      });
      this.ingredientMargins.set(marginsMap);
    } catch (error) {
      console.error('Error loading margins:', error);
    }
  }

  async loadUnits() {
    try {
      const data = await this.firestoreService.getDocuments('units');
      this.units.set(data as Unit[]);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  }

  selectedDough = computed(() => {
    const id = this.selectedDoughId();
    return id ? this.doughs().find(d => d.id === id) : null;
  });

  selectedRecipe = computed(() => {
    const id = this.selectedRecipeId();
    return id ? this.recipes().find(r => r.id === id) : null;
  });

  margin = computed(() => {
    const marginData = this.margins()[0];
    if (!marginData) {
      return { total: 30, recovery: 10, reinvestment: 10, profit: 10 };
    }
    const total = marginData.recoveryPercentage + marginData.reinvestmentPercentage + marginData.profitPercentage;
    return {
      total: total,
      recovery: marginData.recoveryPercentage,
      reinvestment: marginData.reinvestmentPercentage,
      profit: marginData.profitPercentage
    };
  });

  doughIngredients = computed<IngredientCost[]>(() => {
    const dough = this.selectedDough();
    if (!dough) return [];

    const calculatedIngredients = this.doughCalcService.calculateIngredientQuantities(
      dough,
      this.doughBallWeight(),
      this.quantity(),
      this.costs()
    );

    const margins = this.ingredientMargins();
    const defaultMargin = 30;

    return calculatedIngredients.map(ing => {
      const cost = this.costs().find(c => c.id === ing.costId);
      const unitCost = cost ? cost.value : 0;
      const totalCost = cost 
        ? this.doughCalcService.calculateIngredientCost(ing.quantity, cost, this.units())
        : 0;
      
      // Prioridad: 1) Map (editado por usuario), 2) Firestore, 3) default
      let margin = margins.get(ing.costId);
      if (margin === undefined) {
        const marginData = this.margins().find(m => m.costId === ing.costId);
        margin = marginData 
          ? marginData.recoveryPercentage + marginData.reinvestmentPercentage + marginData.profitPercentage
          : defaultMargin;
      }
      
      return {
        costId: ing.costId,
        name: ing.name,
        quantity: ing.quantity,
        unitCost: unitCost,
        totalCost: Math.round(totalCost * 100) / 100,
        margin: margin
      };
    });
  });

  recipeIngredients = computed<IngredientCost[]>(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return [];

    const qty = this.quantity();
    const margins = this.ingredientMargins();
    const defaultMargin = 30;

    return recipe.ingredients.map(ingredient => {
      const cost = this.costs().find(c => c.id === ingredient.costId);
      const unitCost = cost ? cost.value : 0;
      
      // Multiply ingredient quantity by number of pizzas
      const totalQuantity = ingredient.quantity * qty;
      const totalCost = cost 
        ? this.doughCalcService.calculateIngredientCost(totalQuantity, cost, this.units())
        : 0;
      
      // Prioridad: 1) Map (editado por usuario), 2) Firestore, 3) default
      let margin = margins.get(ingredient.costId);
      if (margin === undefined) {
        const marginData = this.margins().find(m => m.costId === ingredient.costId);
        margin = marginData 
          ? marginData.recoveryPercentage + marginData.reinvestmentPercentage + marginData.profitPercentage
          : defaultMargin;
      }
      
      return {
        costId: ingredient.costId,
        name: cost?.product || 'Desconocido',
        quantity: totalQuantity,
        unitCost: unitCost,
        totalCost: Math.round(totalCost * 100) / 100,
        margin: margin
      };
    });
  });

  // Costos base sin márgenes
  doughCost = computed(() => {
    return this.doughIngredients().reduce((sum, ing) => sum + ing.totalCost, 0);
  });

  recipeCost = computed(() => {
    return this.recipeIngredients().reduce((sum, ing) => sum + ing.totalCost, 0);
  });

  baseCost = computed(() => {
    return this.doughCost() + this.recipeCost();
  });

  // Costos con márgenes aplicados
  doughCostWithMargin = computed(() => {
    return this.doughIngredients().reduce((sum, ing) => {
      const costWithMargin = ing.totalCost * (ing.margin / 100);
      return sum + costWithMargin;
    }, 0);
  });

  recipeCostWithMargin = computed(() => {
    return this.recipeIngredients().reduce((sum, ing) => {
      const costWithMargin = ing.totalCost * (ing.margin / 100);
      return sum + costWithMargin;
    }, 0);
  });

  totalCostPerUnit = computed(() => {
    return this.doughCostWithMargin() + this.recipeCostWithMargin();
  });

  // Margen total aplicado (diferencia entre precio final y costo base)
  marginAmount = computed(() => {
    return this.totalCostPerUnit() - this.baseCost();
  });

  // Calcular el porcentaje de margen total promedio aplicado
  totalMarginPercentage = computed(() => {
    const base = this.baseCost();
    if (base === 0) return 0;
    return (this.marginAmount() / base) * 100;
  });

  // Calcular montos reales de cada categoría de margen
  marginBreakdown = computed(() => {
    let recovery = 0;
    let reinvestment = 0;
    let profit = 0;

    // Sumar contribuciones de ingredientes de la masa
    this.doughIngredients().forEach(ing => {
      const marginData = this.margins().find(m => m.costId === ing.costId);
      if (marginData) {
        const totalMarginAmount = ing.totalCost * (ing.margin / 100);
        const totalMarginPercent = marginData.recoveryPercentage + marginData.reinvestmentPercentage + marginData.profitPercentage;
        
        recovery += totalMarginAmount * (marginData.recoveryPercentage / totalMarginPercent);
        reinvestment += totalMarginAmount * (marginData.reinvestmentPercentage / totalMarginPercent);
        profit += totalMarginAmount * (marginData.profitPercentage / totalMarginPercent);
      }
    });

    // Sumar contribuciones de ingredientes de la receta
    this.recipeIngredients().forEach(ing => {
      const marginData = this.margins().find(m => m.costId === ing.costId);
      if (marginData) {
        const totalMarginAmount = ing.totalCost * (ing.margin / 100);
        const totalMarginPercent = marginData.recoveryPercentage + marginData.reinvestmentPercentage + marginData.profitPercentage;
        
        recovery += totalMarginAmount * (marginData.recoveryPercentage / totalMarginPercent);
        reinvestment += totalMarginAmount * (marginData.reinvestmentPercentage / totalMarginPercent);
        profit += totalMarginAmount * (marginData.profitPercentage / totalMarginPercent);
      }
    });

    return { recovery, reinvestment, profit };
  });

  pricePerUnit = computed(() => {
    // Redondear hacia arriba al múltiplo de 100 más cercano
    return Math.ceil(this.totalCostPerUnit() / 100) * 100;
  });

  // Redondeo comercial aplicado
  commercialRounding = computed(() => {
    return this.pricePerUnit() - this.totalCostPerUnit();
  });

  totalCost = computed(() => {
    return this.totalCostPerUnit() * this.quantity();
  });

  totalMargin = computed(() => {
    return this.marginAmount() * this.quantity();
  });

  totalPrice = computed(() => {
    return this.pricePerUnit() * this.quantity();
  });

  hasSelection = computed(() => {
    return this.selectedDoughId() !== null && this.selectedRecipeId() !== null;
  });

  reset() {
    this.selectedDoughId.set(null);
    this.selectedRecipeId.set(null);
    this.quantity.set(1);
    this.ingredientMargins.set(new Map());
  }

  updateIngredientMargin(costId: string, margin: number | string) {
    const marginValue = typeof margin === 'string' ? parseFloat(margin) : margin;
    if (isNaN(marginValue)) return;
    
    const newMargins = new Map(this.ingredientMargins());
    newMargins.set(costId, marginValue);
    this.ingredientMargins.set(newMargins);
  }
}
