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
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
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

  displayedColumns: string[] = ['ingredient', 'quantity', 'unitCost', 'totalCost'];

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

  doughIngredients = computed<IngredientCost[]>(() => {
    const dough = this.selectedDough();
    if (!dough) return [];

    const calculatedIngredients = this.doughCalcService.calculateIngredientQuantities(
      dough,
      this.doughBallWeight(),
      this.quantity(),
      this.costs()
    );

    return calculatedIngredients.map(ing => {
      const cost = this.costs().find(c => c.id === ing.costId);
      const unitCost = cost ? cost.value : 0;
      const totalCost = cost 
        ? this.doughCalcService.calculateIngredientCost(ing.quantity, cost, this.units())
        : 0;
      
      return {
        name: ing.name,
        quantity: ing.quantity,
        unitCost: unitCost,
        totalCost: Math.round(totalCost * 100) / 100
      };
    });
  });

  recipeIngredients = computed<IngredientCost[]>(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return [];

    const qty = this.quantity();

    return recipe.ingredients.map(ingredient => {
      const cost = this.costs().find(c => c.id === ingredient.costId);
      const unitCost = cost ? cost.value : 0;
      
      // Multiply ingredient quantity by number of pizzas
      const totalQuantity = ingredient.quantity * qty;
      const totalCost = cost 
        ? this.doughCalcService.calculateIngredientCost(totalQuantity, cost, this.units())
        : 0;
      
      return {
        name: cost?.product || 'Desconocido',
        quantity: totalQuantity,
        unitCost: unitCost,
        totalCost: Math.round(totalCost * 100) / 100
      };
    });
  });

  doughCost = computed(() => {
    return this.doughIngredients().reduce((sum, ing) => sum + ing.totalCost, 0);
  });

  recipeCost = computed(() => {
    return this.recipeIngredients().reduce((sum, ing) => sum + ing.totalCost, 0);
  });

  totalCostPerUnit = computed(() => {
    return this.doughCost() + this.recipeCost();
  });

  margin = computed(() => {
    const margin = this.margins()[0];
    if (!margin) return { total: 30, recovery: 0, reinvestment: 0, profit: 30 };
    
    return {
      total: margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage,
      recovery: margin.recoveryPercentage,
      reinvestment: margin.reinvestmentPercentage,
      profit: margin.profitPercentage
    };
  });

  marginAmount = computed(() => {
    return this.totalCostPerUnit() * (this.margin().total / 100);
  });

  pricePerUnit = computed(() => {
    return this.totalCostPerUnit() + this.marginAmount();
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
  }
}
