import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FirestoreService } from '../firestore.service';
import { Price } from '../models/price.model';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { Margin } from '../models/margin.model';
import { Recipe } from '../models/recipe.model';

interface ToppingOption {
  id: string;
  label: string;
  extraPrice: number;
}

@Component({
  selector: 'app-order',
  imports: [],
  templateUrl: './order.html',
  styleUrl: './order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Order implements OnInit {
  private readonly firestoreService = inject(FirestoreService);

  readonly loading = signal(true);
  readonly selectedPriceId = signal<string | null>(null);
  readonly excludedIngredientIds = signal<string[]>([]);
  readonly additionalIngredientIds = signal<string[]>([]);

  private readonly prices = signal<Price[]>([]);
  private readonly recipes = signal<Recipe[]>([]);
  private readonly toppings = signal<Topping[]>([]);
  private readonly costs = signal<Cost[]>([]);
  private readonly margins = signal<Margin[]>([]);

  readonly menuOptions = computed(() => {
    return [...this.prices()]
      .filter((price) => !!price.id)
      .sort((a, b) => a.price - b.price);
  });

  readonly toppingOptions = computed<ToppingOption[]>(() => {
    const costs = this.costs();
    const margins = this.margins();

    return this.toppings()
      .filter((topping): topping is Topping & { id: string } => !!topping.id)
      .map((topping) => {
        const cost = costs.find((item) => item.id === topping.costId);
        const margin = margins.find((item) => item.costId === topping.costId);
        const marginPercent = margin
          ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
          : 0;

        const baseCost = topping.quantity * (cost?.value ?? 0);
        const marginAmount = baseCost * (marginPercent / 100);
        const computedPrice = baseCost + marginAmount;
        const extraPrice = this.toValidPrice(computedPrice) ?? 0;
        const productName = cost?.product ?? 'Ingrediente';

        return {
          id: topping.id,
          label: productName,
          extraPrice,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  readonly menuIngredients = computed<Map<string, string[]>>(() => {
    const result = new Map<string, string[]>();
    const allToppings = this.toppings();
    const allCosts = this.costs();

    for (const price of this.menuOptions()) {
      const recipe = this.recipes().find((r) => r.id === price.recipeId);
      if (!recipe) {
        result.set(price.id!, []);
        continue;
      }

      const names = recipe.toppings
        .map((tId) => {
          const topping = allToppings.find((t) => t.id === tId);
          if (!topping) return null;
          return allCosts.find((c) => c.id === topping.costId)?.product ?? null;
        })
        .filter((n): n is string => n !== null);

      result.set(price.id!, names);
    }

    return result;
  });

  readonly selectedMenuRecipe = computed(() => {
    const selectedMenu = this.selectedMenuOption();
    const recipeId = selectedMenu?.recipeId;
    if (!recipeId) {
      return null;
    }

    return this.recipes().find((recipe) => recipe.id === recipeId) ?? null;
  });

  readonly excludableToppingOptions = computed<ToppingOption[]>(() => {
    const recipe = this.selectedMenuRecipe();
    if (!recipe) {
      return [];
    }

    const recipeToppingIds = new Set(recipe.toppings);
    return this.toppingOptions().filter((option) => recipeToppingIds.has(option.id));
  });

  readonly additionalToppingOptions = computed<ToppingOption[]>(() => {
    const sizeM = new Set(
      this.toppings()
        .filter((t): t is Topping & { id: string } => !!t.id && t.size === 'M')
        .map((t) => t.id)
    );

    return this.toppingOptions().filter((option) => sizeM.has(option.id));
  });

  readonly selectedMenuOption = computed(() => {
    const selectedId = this.selectedPriceId();
    if (!selectedId) {
      return null;
    }

    return this.menuOptions().find((price) => price.id === selectedId) ?? null;
  });

  readonly excludedOptions = computed(() => {
    const selected = new Set(this.excludedIngredientIds());
    return this.excludableToppingOptions().filter((option) => selected.has(option.id));
  });

  readonly additionalOptions = computed(() => {
    const selected = new Set(this.additionalIngredientIds());
    return this.additionalToppingOptions().filter((option) => selected.has(option.id));
  });

  readonly additionalTotal = computed(() => {
    return Math.round(this.additionalOptions().reduce((sum, option) => sum + option.extraPrice, 0) * 100) / 100;
  });

  readonly total = computed(() => {
    const base = this.selectedMenuOption()?.price ?? 0;
    return Math.round((base + this.additionalTotal()) * 100) / 100;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [prices, recipes, toppings, costs, margins] = await Promise.all([
        this.firestoreService.getDocuments('prices'),
        this.firestoreService.getDocuments('recipes'),
        this.firestoreService.getDocuments('toppings'),
        this.firestoreService.getDocuments('costs'),
        this.firestoreService.getDocuments('margins'),
      ]);

      this.prices.set(prices as Price[]);
      this.recipes.set(recipes as Recipe[]);
      this.toppings.set(toppings as Topping[]);
      this.costs.set(costs as Cost[]);
      this.margins.set(margins as Margin[]);
    } catch (error) {
      console.error('Error loading order data', error);
    } finally {
      this.loading.set(false);
    }
  }

  selectMenuOption(id: string): void {
    this.selectedPriceId.set(id);
    this.excludedIngredientIds.set([]);
    this.additionalIngredientIds.set([]);
  }

  toggleExcludedIngredient(id: string): void {
    if (!this.excludableToppingOptions().some((option) => option.id === id)) {
      return;
    }

    this.excludedIngredientIds.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  toggleAdditionalIngredient(id: string): void {
    this.additionalIngredientIds.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  isExcludedIngredientSelected(id: string): boolean {
    return this.excludedIngredientIds().includes(id);
  }

  isAdditionalIngredientSelected(id: string): boolean {
    return this.additionalIngredientIds().includes(id);
  }

  placeOrder(): void {
    // Placeholder for order submission.
  }

  formatPrice(value: number): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    const rounded = Math.round(safeValue);
    const formatter = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return `$ ${formatter.format(rounded)}`;
  }

  private toValidPrice(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }
}
