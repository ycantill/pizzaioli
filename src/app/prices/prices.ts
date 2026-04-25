import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Dough } from '../models/dough.model';
import { Recipe } from '../models/recipe.model';
import { Cost } from '../models/cost.model';
import { Margin } from '../models/margin.model';
import { Unit } from '../models/unit.model';
import { Delivery } from '../models/delivery.model';
import { Price } from '../models/price.model';
import { Consumption } from '../models/consumption.model';
import { Labor } from '../models/labor.model';
import { FirestoreService } from '../firestore.service';
import { DoughCalculationService } from '../services/dough-calculation.service';
import { ConfirmDialog } from '../shared/confirm-dialog';

interface CostLineItem {
  name: string;
  quantity: number;
  unitCost: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
}

interface LaborLineItem {
  name: string;
  hours: number;
  costPerHour: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
}

@Component({
  selector: 'app-prices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DecimalPipe
  ],
  templateUrl: './prices.html',
  styleUrl: './prices.css'
})
export class Prices implements OnInit {
  private firestoreService = inject(FirestoreService);
  private doughCalcService = inject(DoughCalculationService);
  private dialog = inject(MatDialog);

  doughs = signal<Dough[]>([]);
  recipes = signal<Recipe[]>([]);
  costs = signal<Cost[]>([]);
  margins = signal<Margin[]>([]);
  units = signal<Unit[]>([]);
  deliveries = signal<Delivery[]>([]);
  consumptions = signal<Consumption[]>([]);
  labors = signal<Labor[]>([]);
  savedPrices = signal<Price[]>([]);

  selectedDoughId = signal<string | null>(null);
  selectedRecipeId = signal<string | null>(null);
  ballWeight = signal(250);
  priceName = signal('');

  loading = signal(true);
  saving = signal(false);

  ingredientColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin'];
  laborColumns: string[] = ['name', 'costPerHour', 'hours', 'baseCost', 'margin', 'costWithMargin'];
  savedPricesColumns: string[] = ['name', 'price', 'actions'];

  constructor() {
    effect(() => {
      const doughId = this.selectedDoughId();
      if (doughId) {
        const dough = this.doughs().find(d => d.id === doughId);
        if (dough) {
          this.ballWeight.set(dough.ballWeight);
        }
      }
    });
  }

  async ngOnInit() {
    try {
      const [doughs, recipes, costs, margins, units, deliveries, consumptions, labors, prices] = await Promise.all([
        this.firestoreService.getDocuments('doughs'),
        this.firestoreService.getDocuments('recipes'),
        this.firestoreService.getDocuments('costs'),
        this.firestoreService.getDocuments('margins'),
        this.firestoreService.getDocuments('units'),
        this.firestoreService.getDocuments('deliveries'),
        this.firestoreService.getDocuments('consumptions'),
        this.firestoreService.getDocuments('labors'),
        this.firestoreService.getDocuments('prices')
      ]);
      this.doughs.set(doughs as Dough[]);
      this.recipes.set(recipes as Recipe[]);
      this.costs.set(costs as Cost[]);
      this.margins.set(margins as Margin[]);
      this.units.set(units as Unit[]);
      this.deliveries.set(deliveries as Delivery[]);
      this.consumptions.set(consumptions as Consumption[]);
      this.labors.set(labors as Labor[]);
      this.savedPrices.set(prices as Price[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  selectedDough = computed(() => {
    const id = this.selectedDoughId();
    return id ? this.doughs().find(d => d.id === id) ?? null : null;
  });

  selectedRecipe = computed(() => {
    const id = this.selectedRecipeId();
    return id ? this.recipes().find(r => r.id === id) ?? null : null;
  });

  doughLineItems = computed<CostLineItem[]>(() => {
    const dough = this.selectedDough();
    if (!dough) return [];

    const allCosts = this.costs();
    const allMargins = this.margins();
    const weight = this.ballWeight();

    const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(dough, allCosts);
    if (bakerPercentages.length === 0) return [];

    const totalBakerPercentage = bakerPercentages.reduce(
      (sum, bp) => sum + bp.bakerPercentage, 0
    );
    if (totalBakerPercentage === 0) return [];

    const ingredientMultiplier = weight / totalBakerPercentage;

    return bakerPercentages.map(bp => {
      const cost = allCosts.find(c => c.id === bp.costId);
      if (!cost) return null;

      const actualQuantity = ingredientMultiplier * bp.bakerPercentage;
      const baseCost = actualQuantity * cost.value;

      const margin = allMargins.find(m => m.costId === bp.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);

      return {
        name: cost.product,
        quantity: Math.round(actualQuantity * 100) / 100,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100
      };
    }).filter((item): item is CostLineItem => item !== null);
  });

  recipeLineItems = computed<CostLineItem[]>(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return [];

    const allCosts = this.costs();
    const allMargins = this.margins();

    return recipe.ingredients.map(ing => {
      const cost = allCosts.find(c => c.id === ing.costId);
      if (!cost) return null;

      const baseCost = ing.quantity * cost.value;

      const margin = allMargins.find(m => m.costId === ing.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);

      return {
        name: cost.product,
        quantity: ing.quantity,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100
      };
    }).filter((item): item is CostLineItem => item !== null);
  });

  matchedDelivery = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.deliveries().find(d => d.recipeTypeId === recipe.recipeTypeId) ?? null;
  });

  deliveryLineItems = computed<CostLineItem[]>(() => {
    const delivery = this.matchedDelivery();
    if (!delivery) return [];

    const allCosts = this.costs();
    const allMargins = this.margins();

    return delivery.items.map(item => {
      const cost = allCosts.find(c => c.id === item.costId);
      if (!cost) return null;

      const baseCost = item.quantity * cost.value;

      const margin = allMargins.find(m => m.costId === item.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);

      return {
        name: cost.product,
        quantity: item.quantity,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100
      };
    }).filter((item): item is CostLineItem => item !== null);
  });

  matchedLabor = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.labors().find(l => l.recipeTypeId === recipe.recipeTypeId) ?? null;
  });

  laborLineItems = computed<LaborLineItem[]>(() => {
    const labor = this.matchedLabor();
    if (!labor) return [];

    const allConsumptions = this.consumptions();
    const allCosts = this.costs();
    const allMargins = this.margins();

    return labor.items.map(item => {
      const consumption = allConsumptions.find(c => c.id === item.consumptionId);
      if (!consumption) return null;

      const cost = allCosts.find(c => c.id === consumption.costId);
      if (!cost) return null;

      const hours = item.minutes / 60;
      const costPerHour = consumption.quantity * cost.value;
      const baseCost = hours * costPerHour;

      const margin = allMargins.find(m => m.costId === consumption.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);

      return {
        name: consumption.name,
        hours,
        costPerHour: Math.round(costPerHour * 100) / 100,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100
      };
    }).filter((item): item is LaborLineItem => item !== null);
  });

  doughSubtotal = computed(() => {
    const items = this.doughLineItems();
    return {
      baseCost: Math.round(items.reduce((sum, item) => sum + item.baseCost, 0) * 100) / 100,
      costWithMargin: Math.round(items.reduce((sum, item) => sum + item.costWithMargin, 0) * 100) / 100
    };
  });

  recipeSubtotal = computed(() => {
    const items = this.recipeLineItems();
    return {
      baseCost: Math.round(items.reduce((sum, item) => sum + item.baseCost, 0) * 100) / 100,
      costWithMargin: Math.round(items.reduce((sum, item) => sum + item.costWithMargin, 0) * 100) / 100
    };
  });

  deliverySubtotal = computed(() => {
    const items = this.deliveryLineItems();
    return {
      baseCost: Math.round(items.reduce((sum, item) => sum + item.baseCost, 0) * 100) / 100,
      costWithMargin: Math.round(items.reduce((sum, item) => sum + item.costWithMargin, 0) * 100) / 100
    };
  });

  laborSubtotal = computed(() => {
    const items = this.laborLineItems();
    return {
      baseCost: Math.round(items.reduce((sum, item) => sum + item.baseCost, 0) * 100) / 100,
      costWithMargin: Math.round(items.reduce((sum, item) => sum + item.costWithMargin, 0) * 100) / 100
    };
  });

  totalBaseCost = computed(() => {
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.deliveryLineItems()];
    const ingredientTotal = ingredients.reduce((sum, item) => sum + item.baseCost, 0);
    const laborTotal = this.laborLineItems().reduce((sum, item) => sum + item.baseCost, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  totalWithMargin = computed(() => {
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.deliveryLineItems()];
    const ingredientTotal = ingredients.reduce((sum, item) => sum + item.costWithMargin, 0);
    const laborTotal = this.laborLineItems().reduce((sum, item) => sum + item.costWithMargin, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  suggestedPrice = computed(() => {
    const total = this.totalWithMargin();
    if (total <= 0) return 0;
    return Math.ceil(total / 100) * 100;
  });

  canSave = computed(() => {
    return this.priceName().trim().length > 0 && this.suggestedPrice() > 0 && !this.saving();
  });

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);
  }

  onRecipeSelected(recipeId: string | null) {
    this.selectedRecipeId.set(recipeId);
  }

  formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  }

  async savePrice() {
    if (!this.canSave()) return;

    this.saving.set(true);
    try {
      const priceData = { name: this.priceName().trim(), price: this.suggestedPrice() };
      const docRef = await this.firestoreService.addDocument('prices', priceData);
      this.savedPrices.update(list => [...list, { ...priceData, id: docRef.id }]);
      this.priceName.set('');
    } catch (error) {
      console.error('Error saving price:', error);
    } finally {
      this.saving.set(false);
    }
  }

  deletePrice(price: Price) {
    if (!price.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminacion',
        message: `¿Estas seguro de que deseas eliminar el precio "${price.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('prices', price.id!);
          this.savedPrices.update(list => list.filter(p => p.id !== price.id));
        } catch (error) {
          console.error('Error deleting price:', error);
        }
      }
    });
  }
}
