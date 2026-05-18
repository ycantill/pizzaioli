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
import { MatRadioModule } from '@angular/material/radio';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Dough } from '../models/dough.model';
import { Recipe } from '../models/recipe.model';
import { RecipeType } from '../models/recipe-type.model';
import { Cost } from '../models/cost.model';
import { Margin } from '../models/margin.model';
import { Unit } from '../models/unit.model';
import { Packaging } from '../models/packaging.model';
import { Price } from '../models/price.model';
import { Consumption } from '../models/consumption.model';
import { Labor } from '../models/labor.model';
import { Topping } from '../models/topping.model';
import { FirestoreService } from '../firestore.service';
import { DoughCalculationService } from '../services/dough-calculation.service';
import { ConfirmDialog } from '../shared/confirm-dialog';

interface CostLineItem {
  toppingId?: string;
  name: string;
  quantity: number;
  unitCost: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
  isRecoveryOnly: boolean;
}

interface LaborLineItem {
  name: string;
  hours: number;
  costPerHour: number;
  baseCost: number;
  marginPercent: number;
  costWithMargin: number;
  isRecoveryOnly: boolean;
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
    MatRadioModule,
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
  recipeTypes = signal<RecipeType[]>([]);
  costs = signal<Cost[]>([]);
  margins = signal<Margin[]>([]);
  units = signal<Unit[]>([]);
  packagings = signal<Packaging[]>([]);
  consumptions = signal<Consumption[]>([]);
  labors = signal<Labor[]>([]);
  toppings = signal<Topping[]>([]);
  savedPrices = signal<Price[]>([]);
  sortedSavedPrices = computed(() => [...this.savedPrices()].sort((a, b) => a.price - b.price));

  selectedDoughId = signal<string | null>(null);
  selectedRecipeId = signal<string | null>(null);
  ballWeight = signal(250);
  priceName = signal('');
  ajuste = signal<number>(0);
  ajusteDescription = signal('');
  ajusteMode = signal<'manual' | 'auto'>('manual');
  targetMarginPercent = signal<number>(200);
  selectedAdditionIds = signal<string[]>([]);
  removedIngredientIds = signal<string[]>([]);
  pendingAdditionId = signal<string | null>(null);

  loading = signal(true);
  saving = signal(false);

  ingredientColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin'];
  recipeIngredientColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin', 'remove'];
  additionColumns: string[] = ['name', 'quantity', 'unitCost', 'baseCost', 'margin', 'costWithMargin', 'remove'];
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
      const [doughs, recipes, recipeTypes, costs, margins, units, packagings, consumptions, labors, prices, toppings] = await Promise.all([
        this.firestoreService.getDocuments('doughs'),
        this.firestoreService.getDocuments('recipes'),
        this.firestoreService.getDocuments('recipe-types'),
        this.firestoreService.getDocuments('costs'),
        this.firestoreService.getDocuments('margins'),
        this.firestoreService.getDocuments('units'),
        this.firestoreService.getDocuments('packagings'),
        this.firestoreService.getDocuments('consumptions'),
        this.firestoreService.getDocuments('labors'),
        this.firestoreService.getDocuments('prices'),
        this.firestoreService.getDocuments('toppings')
      ]);
      this.doughs.set(doughs as Dough[]);
      this.recipes.set(recipes as Recipe[]);
      this.recipeTypes.set(recipeTypes as RecipeType[]);
      this.costs.set(costs as Cost[]);
      this.margins.set(margins as Margin[]);
      this.units.set(units as Unit[]);
      this.packagings.set(packagings as Packaging[]);
      this.consumptions.set(consumptions as Consumption[]);
      this.labors.set(labors as Labor[]);
      this.savedPrices.set(prices as Price[]);
      this.toppings.set(toppings as Topping[]);
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

  selectedRecipeTypeName = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.recipeTypes().find(rt => rt.id === recipe.recipeTypeId)?.name ?? null;
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
      const isRecoveryOnly = !!margin && margin.profitPercentage === 0 && margin.reinvestmentPercentage === 0 && margin.recoveryPercentage > 0;

      return {
        name: cost.product,
        quantity: Math.round(actualQuantity * 100) / 100,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100,
        isRecoveryOnly
      };
    }).filter((item): item is CostLineItem => item !== null);
  });

  recipeLineItems = computed<CostLineItem[]>(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return [];

    const allToppings = this.toppings();
    const allCosts = this.costs();
    const allMargins = this.margins();
    const removed = new Set(this.removedIngredientIds());

    return recipe.toppings.filter(id => !removed.has(id)).map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const cost = allCosts.find(c => c.id === topping.costId);
      if (!cost) return null;

      const baseCost = topping.quantity * cost.value;

      const margin = allMargins.find(m => m.costId === topping.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);
      const isRecoveryOnly = !!margin && margin.profitPercentage === 0 && margin.reinvestmentPercentage === 0 && margin.recoveryPercentage > 0;

      return {
        toppingId,
        name: `${cost.product} (${topping.size})`,
        quantity: topping.quantity,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100,
        isRecoveryOnly
      };
    }).filter(item => item !== null) as CostLineItem[];
  });

  availableSizeSAdditions = computed(() => {
    const recipeToppingIds = new Set(this.selectedRecipe()?.toppings ?? []);
    const alreadyAdded = new Set(this.selectedAdditionIds());
    const allCosts = this.costs();
    const sizeOrder: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 };
    return this.toppings()
      .filter(t => !recipeToppingIds.has(t.id!) && !alreadyAdded.has(t.id!))
      .sort((a, b) => {
        const nameA = allCosts.find(c => c.id === a.costId)?.product ?? '';
        const nameB = allCosts.find(c => c.id === b.costId)?.product ?? '';
        const nameCmp = nameA.localeCompare(nameB);
        return nameCmp !== 0 ? nameCmp : (sizeOrder[a.size] ?? 99) - (sizeOrder[b.size] ?? 99);
      });
  });

  additionLineItems = computed<CostLineItem[]>(() => {
    const allCosts = this.costs();
    const allMargins = this.margins();
    const allToppings = this.toppings();

    return this.selectedAdditionIds().map(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (!topping) return null;

      const cost = allCosts.find(c => c.id === topping.costId);
      if (!cost) return null;

      const baseCost = topping.quantity * cost.value;
      const margin = allMargins.find(m => m.costId === topping.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);
      const isRecoveryOnly = !!margin && margin.profitPercentage === 0 && margin.reinvestmentPercentage === 0 && margin.recoveryPercentage > 0;

      return {
        name: `${cost.product} (${topping.size})`,
        quantity: topping.quantity,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100,
        isRecoveryOnly
      };
    }).filter((item): item is CostLineItem => item !== null);
  });

  additionSubtotal = computed(() => {
    const items = this.additionLineItems();
    return {
      baseCost: Math.round(items.reduce((sum, i) => sum + i.baseCost, 0) * 100) / 100,
      costWithMargin: Math.round(items.reduce((sum, i) => sum + i.costWithMargin, 0) * 100) / 100
    };
  });

  matchedPackaging = computed(() => {
    const recipe = this.selectedRecipe();
    if (!recipe) return null;
    return this.packagings().find(d => d.recipeTypeId === recipe.recipeTypeId) ?? null;
  });

  packagingLineItems = computed<CostLineItem[]>(() => {
    const packaging = this.matchedPackaging();
    if (!packaging) return [];

    const allCosts = this.costs();
    const allMargins = this.margins();

    return packaging.items.map(item => {
      const cost = allCosts.find(c => c.id === item.costId);
      if (!cost) return null;

      const baseCost = item.quantity * cost.value;

      const margin = allMargins.find(m => m.costId === item.costId);
      const totalMargin = margin
        ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
        : 0;
      const costWithMargin = baseCost * (totalMargin / 100);
      const isRecoveryOnly = !!margin && margin.profitPercentage === 0 && margin.reinvestmentPercentage === 0 && margin.recoveryPercentage > 0;

      return {
        name: cost.product,
        quantity: item.quantity,
        unitCost: cost.value,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100,
        isRecoveryOnly
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
      const isRecoveryOnly = !!margin && margin.profitPercentage === 0 && margin.reinvestmentPercentage === 0 && margin.recoveryPercentage > 0;

      return {
        name: consumption.name,
        hours,
        costPerHour: Math.round(costPerHour * 100) / 100,
        baseCost: Math.round(baseCost * 100) / 100,
        marginPercent: totalMargin,
        costWithMargin: Math.round(costWithMargin * 100) / 100,
        isRecoveryOnly
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

  packagingSubtotal = computed(() => {
    const items = this.packagingLineItems();
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
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.additionLineItems(), ...this.packagingLineItems()];
    const ingredientTotal = ingredients.reduce((sum, item) => sum + item.baseCost, 0);
    const laborTotal = this.laborLineItems().reduce((sum, item) => sum + item.baseCost, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  totalWithMargin = computed(() => {
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.additionLineItems(), ...this.packagingLineItems()];
    const ingredientTotal = ingredients.reduce((sum, item) => sum + item.costWithMargin, 0);
    const laborTotal = this.laborLineItems().reduce((sum, item) => sum + item.costWithMargin, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  totalMarginAmount = computed(() => {
    return Math.round((this.suggestedPrice() - this.totalBaseCost()) * 100) / 100;
  });

  totalBaseCostExcludingRecovery = computed(() => {
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.additionLineItems(), ...this.packagingLineItems()];
    const ingredientTotal = ingredients.filter(i => !i.isRecoveryOnly).reduce((sum, i) => sum + i.baseCost, 0);
    const laborTotal = this.laborLineItems().filter(i => !i.isRecoveryOnly).reduce((sum, i) => sum + i.baseCost, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  totalWithMarginProfitOnly = computed(() => {
    const ingredients = [...this.doughLineItems(), ...this.recipeLineItems(), ...this.additionLineItems(), ...this.packagingLineItems()];
    const ingredientTotal = ingredients.filter(i => !i.isRecoveryOnly).reduce((sum, i) => sum + i.costWithMargin, 0);
    const laborTotal = this.laborLineItems().filter(i => !i.isRecoveryOnly).reduce((sum, i) => sum + i.costWithMargin, 0);
    return Math.round((ingredientTotal + laborTotal) * 100) / 100;
  });

  totalWithMarginPercent = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round(((this.totalWithMarginProfitOnly() - base) / base) * 10000) / 100;
  });

  averageWeightedMargin = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round((this.totalWithMarginProfitOnly() / base) * 10000) / 100;
  });

  totalRecoveryWithMargin = computed(() => {
    return Math.round((this.totalWithMargin() - this.totalWithMarginProfitOnly()) * 100) / 100;
  });

  totalProfitAndReinvestmentAmount = computed(() => {
    return Math.round((this.totalWithMarginProfitOnly() - this.totalBaseCostExcludingRecovery()) * 100) / 100;
  });

  totalMarginPercent = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    if (base === 0) return 0;
    return Math.round((this.totalMarginAmount() / base) * 10000) / 100;
  });

  autoSuggestedPrice = computed(() => {
    const base = this.totalBaseCostExcludingRecovery();
    return Math.round((this.totalBaseCost() + (this.targetMarginPercent() / 100) * base) * 100) / 100;
  });

  autoAjuste = computed(() => {
    return Math.round((this.autoSuggestedPrice() - this.totalWithMargin()) * 100) / 100;
  });

  effectiveAjuste = computed(() =>
    this.ajusteMode() === 'auto' ? this.autoAjuste() : this.ajuste()
  );

  suggestedPrice = computed(() => {
    const total = this.totalWithMargin();
    if (total <= 0) return 0;
    return Math.ceil((total + this.effectiveAjuste()) / 1000) * 1000;
  });

  canSave = computed(() => {
    return this.priceName().trim().length > 0 && this.suggestedPrice() > 0 && !this.saving();
  });

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);
  }

  onRecipeSelected(recipeId: string | null) {
    this.selectedRecipeId.set(recipeId);
    this.selectedAdditionIds.set([]);
    this.removedIngredientIds.set([]);
    this.pendingAdditionId.set(null);
    const recipe = recipeId ? this.recipes().find(r => r.id === recipeId) ?? null : null;
    if (recipe) {
      const typeName = this.recipeTypes().find(rt => rt.id === recipe.recipeTypeId)?.name ?? '';
      this.priceName.set(typeName ? `${typeName} - ${recipe.name}` : recipe.name);
    } else {
      this.priceName.set('');
    }
  }

  getToppingDisplayLabel(toppingId: string): string {
    const topping = this.toppings().find(t => t.id === toppingId);
    if (!topping) return 'Desconocido';
    const cost = this.costs().find(c => c.id === topping.costId);
    return `${cost?.product ?? 'Desconocido'} — ${topping.size} (${topping.quantity}g)`;
  }

  addAddition() {
    const id = this.pendingAdditionId();
    if (!id) return;
    this.selectedAdditionIds.update(ids => [...ids, id]);
    this.pendingAdditionId.set(null);
  }

  removeAddition(toppingId: string) {
    this.selectedAdditionIds.update(ids => ids.filter(id => id !== toppingId));
  }

  removeIngredient(toppingId: string) {
    this.removedIngredientIds.update(ids => [...ids, toppingId]);
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
      const priceData: Price = {
        name: this.priceName().trim(),
        price: this.suggestedPrice(),
        doughId: this.selectedDoughId(),
        recipeId: this.selectedRecipeId(),
        ballWeight: this.ballWeight(),
        ajuste: this.ajuste(),
        ajusteDescription: this.ajusteDescription(),
        additionToppingIds: this.selectedAdditionIds().length ? this.selectedAdditionIds() : undefined,
        removedIngredientIds: this.removedIngredientIds().length ? this.removedIngredientIds() : undefined,
      };
      const docRef = await this.firestoreService.addDocument('prices', priceData);
      this.savedPrices.update(list => [...list, { ...priceData, id: docRef.id }]);
      this.priceName.set('');
    } catch (error) {
      console.error('Error saving price:', error);
    } finally {
      this.saving.set(false);
    }
  }

  loadPrice(price: Price): void {
    this.selectedDoughId.set(price.doughId ?? null);
    this.selectedRecipeId.set(price.recipeId ?? null);
    this.ballWeight.set(price.ballWeight ?? 250);
    this.ajuste.set(price.ajuste ?? 0);
    this.ajusteDescription.set(price.ajusteDescription ?? '');
    this.priceName.set(price.name);
    this.selectedAdditionIds.set(price.additionToppingIds ?? []);
    this.removedIngredientIds.set(price.removedIngredientIds ?? []);
    this.pendingAdditionId.set(null);
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
