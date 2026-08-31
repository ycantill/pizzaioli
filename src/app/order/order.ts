import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PricesDataService } from '../services/prices-data.service';
import { RecipesDataService } from '../services/recipes-data.service';
import { ToppingsDataService } from '../services/toppings-data.service';
import { CatalogService } from '../services/catalog.service';
import { marginPercent } from '../services/pricing';
import { Topping } from '../models/topping.model';
import { Recipe } from '../models/recipe.model';

interface ToppingOption {
  id: string;
  label: string;
  extraPrice: number;
  size: string;
}

interface IngredientOption {
  id: string;
  label: string;
  price: number;
  excludable: boolean;
  addable: boolean;
  salsaBase: boolean;
  size: string;
}

interface CartSummaryIngredient {
  id: string;
  label: string;
  size: string;
  price: number;
  excluded: boolean;
  additional: boolean;
}

interface CartHalf {
  priceId: string;
  name: string;
  basePrice: number;
  items: CartSummaryIngredient[];
}

interface CartItem {
  id: string;
  isHalfAndHalf: boolean;
  single?: CartHalf;
  halfA?: CartHalf;
  halfB?: CartHalf;
  total: number;
}

@Component({
  selector: 'app-order',
  imports: [],
  templateUrl: './order.html',
  styleUrl: './order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Order {
  private readonly pricesService = inject(PricesDataService);
  private readonly recipesService = inject(RecipesDataService);
  private readonly toppingsService = inject(ToppingsDataService);
  private readonly catalog = inject(CatalogService);

  readonly loading = computed(() =>
    this.pricesService.isLoading() || this.recipesService.isLoading() ||
    this.toppingsService.isLoading() || this.catalog.isLoading()
  );
  readonly selectedPriceId = signal<string | null>(null);
  readonly excludedIngredientIds = signal<string[]>([]);
  readonly additionalIngredientIds = signal<string[]>([]);

  readonly cart = signal<CartItem[]>([]);

  readonly isHalfAndHalf = signal<boolean>(false);
  readonly activeHalf = signal<'A' | 'B'>('A');
  readonly customizingHalf = signal<'A' | 'B'>('A');

  readonly selectedPriceIdA = signal<string | null>(null);
  readonly selectedPriceIdB = signal<string | null>(null);

  readonly excludedIngredientIdsA = signal<string[]>([]);
  readonly excludedIngredientIdsB = signal<string[]>([]);
  readonly additionalIngredientIdsA = signal<string[]>([]);
  readonly additionalIngredientIdsB = signal<string[]>([]);

  private readonly prices = this.pricesService.prices;
  private readonly recipes = this.recipesService.recipes;

  // toppings includes virtual sizes generated from raw data
  private readonly toppings = computed<Topping[]>(() => {
    const raw = this.toppingsService.toppings();
    const SIZES: ('S' | 'M' | 'L' | 'XL' | 'XXL')[] = ['S', 'M', 'L', 'XL', 'XXL'];
    const sizeScale: Record<string, number> = { S: 0.5, M: 1.0, L: 1.5, XL: 2.0, XXL: 2.5 };

    const groups = new Map<string, Topping[]>();
    for (const t of raw) {
      const key = `${t.supplyId.trim()}_${!!t.salsaBase}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    const virtual: Topping[] = [];
    for (const [, list] of groups.entries()) {
      for (const targetSize of SIZES) {
        if (list.some(t => t.size.trim().toUpperCase() === targetSize)) continue;
        const base = list.find(t => t.size.trim().toUpperCase() === 'M') ?? list[0];
        if (base?.id) {
          const baseScale = sizeScale[base.size.trim().toUpperCase()] ?? 1.0;
          virtual.push({
            id: `${base.id}_virtual_${targetSize}`,
            supplyId: base.supplyId.trim(),
            quantity: base.quantity * ((sizeScale[targetSize] ?? 1.0) / baseScale),
            size: targetSize,
            salsaBase: !!base.salsaBase
          });
        }
      }
    }
    return [...raw, ...virtual];
  });

  readonly menuOptions = computed(() => {
    return [...this.prices()]
      .filter((price) => !!price.id)
      .sort((a, b) => a.price - b.price);
  });

  readonly toppingOptions = computed<ToppingOption[]>(() => {
    const allToppings = this.toppings();

    return allToppings
      .filter((topping): topping is Topping & { id: string } => !!topping.id)
      .map((topping) => {
        const item = this.catalog.find(topping.supplyId);

        const baseCost = topping.quantity * (item?.unitCost ?? 0);
        const computedPrice = baseCost * (marginPercent(item?.margin) / 100);
        const extraPrice = this.ceilTo1000(computedPrice);
        const productName = item?.name ?? 'Ingrediente';

        return {
          id: topping.id,
          label: productName,
          extraPrice,
          size: topping.size,
          supplyId: topping.supplyId,
          salsaBase: topping.salsaBase,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  readonly menuIngredients = computed<Map<string, string[]>>(() => {
    const result = new Map<string, string[]>();
    const allToppings = this.toppings();
    const allCosts = this.catalog.items();
    const halfAndHalfMode = this.isHalfAndHalf();

    for (const price of this.menuOptions()) {
      const recipe = this.recipes().find((r) => r.id === price.recipeId);
      if (!recipe) {
        result.set(price.id!, []);
        continue;
      }

      const toppingIds = halfAndHalfMode
        ? Array.from(this.getMappedRecipeToppingIds(recipe, true))
        : recipe.toppings;

      const names = toppingIds
        .map((tId) => {
          const topping = allToppings.find((t) => t.id === tId);
          if (!topping) return null;
          const product = allCosts.find((c) => c.id === topping.supplyId)?.name ?? null;
          return product ? `${product} (${topping.size})` : null;
        })
        .filter((n): n is string => n !== null);

      result.set(price.id!, names);
    }

    return result;
  });

  readonly selectedMenuOptionSingle = computed(() => {
    const selectedId = this.selectedPriceId();
    if (!selectedId) {
      return null;
    }
    return this.menuOptions().find((price) => price.id === selectedId) ?? null;
  });

  readonly selectedMenuRecipeSingle = computed(() => {
    const selectedMenu = this.selectedMenuOptionSingle();
    const recipeId = selectedMenu?.recipeId;
    if (!recipeId) {
      return null;
    }
    return this.recipes().find((recipe) => recipe.id === recipeId) ?? null;
  });

  readonly selectedMenuOptionA = computed(() => {
    const selectedId = this.selectedPriceIdA();
    if (!selectedId) {
      return null;
    }
    return this.menuOptions().find((price) => price.id === selectedId) ?? null;
  });

  readonly selectedMenuRecipeA = computed(() => {
    const selectedMenu = this.selectedMenuOptionA();
    const recipeId = selectedMenu?.recipeId;
    if (!recipeId) {
      return null;
    }
    return this.recipes().find((recipe) => recipe.id === recipeId) ?? null;
  });

  readonly selectedMenuOptionB = computed(() => {
    const selectedId = this.selectedPriceIdB();
    if (!selectedId) {
      return null;
    }
    return this.menuOptions().find((price) => price.id === selectedId) ?? null;
  });

  readonly selectedMenuRecipeB = computed(() => {
    const selectedMenu = this.selectedMenuOptionB();
    const recipeId = selectedMenu?.recipeId;
    if (!recipeId) {
      return null;
    }
    return this.recipes().find((recipe) => recipe.id === recipeId) ?? null;
  });

  readonly currentCustomizingPriceId = computed(() => {
    if (!this.isHalfAndHalf()) {
      return this.selectedPriceId();
    }
    return this.customizingHalf() === 'A' ? this.selectedPriceIdA() : this.selectedPriceIdB();
  });

  readonly selectedMenuOption = computed(() => {
    if (!this.isHalfAndHalf()) {
      return this.selectedMenuOptionSingle();
    }
    return this.selectedMenuOptionA() && this.selectedMenuOptionB() ? this.selectedMenuOptionA() : null;
  });

  readonly selectedMenuRecipe = computed(() => {
    if (!this.isHalfAndHalf()) {
      return this.selectedMenuRecipeSingle();
    }
    return this.customizingHalf() === 'A' ? this.selectedMenuRecipeA() : this.selectedMenuRecipeB();
  });

  readonly excludableToppingOptions = computed<ToppingOption[]>(() => {
    const recipe = this.selectedMenuRecipe();
    if (!recipe) {
      return [];
    }

    const recipeToppingIds = new Set(recipe.toppings);
    const allowedSizes = new Set(
      this.toppings()
        .filter((t): t is Topping & { id: string } => !!t.id && (t.size === 'M' || t.size === 'S'))
        .map((t) => t.id)
    );

    return this.toppingOptions().filter(
      (option) => recipeToppingIds.has(option.id) && allowedSizes.has(option.id)
    );
  });

  readonly additionalToppingOptions = computed<ToppingOption[]>(() => {
    const sizeM = new Set(
      this.toppings()
        .filter((t): t is Topping & { id: string } => !!t.id && t.size === 'M')
        .map((t) => t.id)
    );

    return this.toppingOptions().filter((option) => sizeM.has(option.id));
  });

  readonly allIngredientOptions = computed<IngredientOption[]>(() => {
    const recipe = this.selectedMenuRecipe();
    const halfAndHalfMode = this.isHalfAndHalf();
    return this.getIngredientOptionsForRecipe(recipe, halfAndHalfMode)
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  readonly allSalsaOptions = computed<IngredientOption[]>(() => {
    const recipe = this.selectedMenuRecipe();
    const halfAndHalfMode = this.isHalfAndHalf();
    return this.getSalsaOptionsForRecipe(recipe, halfAndHalfMode)
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  readonly activeSalsaCount = computed(() =>
    this.allSalsaOptions().filter((o) => this.isIngredientActive(o)).length
  );

  private getSecondSmallerSize(size: string): string {
    switch (size.trim().toUpperCase()) {
      case 'XXL': return 'L';
      case 'XL': return 'M';
      case 'L': return 'S';
      case 'M': return 'S';
      default: return 'S';
    }
  }

  private getMappedRecipeToppingIds(recipe: Recipe | null, halfAndHalfMode: boolean): Set<string> {
    if (!recipe) return new Set();
    if (!halfAndHalfMode) return new Set(recipe.toppings);

    const result = new Set<string>();
    const allToppings = this.toppings();

    for (const toppingId of recipe.toppings) {
      const topping = allToppings.find((t) => t.id === toppingId);
      if (!topping) continue;

      const smallerSize = this.getSecondSmallerSize(topping.size);
      const smallerTopping = allToppings.find(
        (t) => t.supplyId.trim() === topping.supplyId.trim() &&
               t.size.trim().toUpperCase() === smallerSize &&
               !!t.salsaBase === !!topping.salsaBase
      );
      if (smallerTopping && smallerTopping.id) {
        result.add(smallerTopping.id);
      } else {
        result.add(toppingId);
      }
    }

    return result;
  }

  private getIngredientOptionsForRecipe(recipe: Recipe | null, halfAndHalfMode: boolean): IngredientOption[] {
    if (!recipe) return [];
    const recipeToppingIds = this.getMappedRecipeToppingIds(recipe, halfAndHalfMode);
    const toppings = this.toppings();

    return this.toppingOptions()
      .flatMap((option): IngredientOption[] => {
        const topping = toppings.find((t) => t.id === option.id);
        if (!topping || topping.salsaBase) return [];

        // Si es mitad y mitad, se quitan todos los ingredientes de tamaño XL
        if (halfAndHalfMode && topping.size.trim().toUpperCase() === 'XL') return [];

        const inRecipe = recipeToppingIds.has(option.id);

        // Filter out incorrect sizes for additional toppings
        if (!inRecipe) {
          const targetSizeForAdd = halfAndHalfMode ? 'S' : 'M';
          if (topping.size.trim().toUpperCase() !== targetSizeForAdd) return [];
        }

        const excludable = inRecipe;
        const addable = !inRecipe;
        if (!excludable && !addable) return [];
        return [{ id: option.id, label: option.label, price: option.extraPrice, excludable, addable, salsaBase: false, size: option.size }];
      });
  }

  private getSalsaOptionsForRecipe(recipe: Recipe | null, halfAndHalfMode: boolean): IngredientOption[] {
    if (!recipe) return [];
    const recipeToppingIds = this.getMappedRecipeToppingIds(recipe, halfAndHalfMode);
    const toppings = this.toppings();

    // Buscar la salsa base original en la receta
    const originalSalsaTopping = recipe.toppings
      .map((tId) => toppings.find((t) => t.id === tId))
      .find((t) => t?.salsaBase === true);

    let targetSalsaSize = 'M'; // Fallback por defecto
    if (originalSalsaTopping) {
      targetSalsaSize = halfAndHalfMode
        ? this.getSecondSmallerSize(originalSalsaTopping.size)
        : originalSalsaTopping.size;
    }

    return this.toppingOptions()
      .flatMap((option): IngredientOption[] => {
        const topping = toppings.find((t) => t.id === option.id);
        if (!topping || !topping.salsaBase) return [];

        // Filtrado dinámico de tamaño de salsas según la fórmula
        if (topping.size.trim().toUpperCase() !== targetSalsaSize) return [];

        const inRecipe = recipeToppingIds.has(option.id);
        const excludable = inRecipe;
        const addable = !inRecipe;
        if (!excludable && !addable) return [];
        return [{ id: option.id, label: option.label, price: option.extraPrice, excludable, addable, salsaBase: true, size: option.size }];
      });
  }

  private getHalfSummaryItems(
    recipe: Recipe | null,
    excludedIds: string[],
    additionalIds: string[],
    isHalf: boolean
  ) {
    const all = [
      ...this.getSalsaOptionsForRecipe(recipe, isHalf),
      ...this.getIngredientOptionsForRecipe(recipe, isHalf)
    ];

    const isOptionActive = (o: IngredientOption) => {
      if (o.excludable) {
        return !excludedIds.includes(o.id);
      }
      return additionalIds.includes(o.id);
    };

    const included = all.filter((o) => o.excludable && isOptionActive(o)).map(o => ({ ...o, excluded: false, additional: false }));
    const excluded = all.filter((o) => o.excludable && !isOptionActive(o)).map(o => ({ ...o, excluded: true, additional: false }));
    const additional = all.filter((o) => o.addable && isOptionActive(o)).map(o => ({ ...o, excluded: false, additional: true }));

    const items = [...included, ...excluded, ...additional].sort((a, b) => {
      const rank = (o: typeof a) => o.salsaBase ? 0 : o.additional ? 2 : 1;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return a.label.localeCompare(b.label, 'es');
    });

    // El precio del ingrediente se respeta por su tamaño, sin divisiones
    const getEffectivePrice = (o: IngredientOption) => {
      return o.price;
    };

    const excludedTotal = excluded.reduce((sum, o) => sum + getEffectivePrice(o), 0);
    const additionalTotal = additional.reduce((sum, o) => sum + getEffectivePrice(o), 0);

    return { items, excludedTotal, additionalTotal, getEffectivePrice };
  }

  readonly summarySingle = computed(() => {
    return this.getHalfSummaryItems(
      this.selectedMenuRecipeSingle(),
      this.excludedIngredientIds(),
      this.additionalIngredientIds(),
      false
    );
  });

  readonly summaryA = computed(() => {
    return this.getHalfSummaryItems(
      this.selectedMenuRecipeA(),
      this.excludedIngredientIdsA(),
      this.additionalIngredientIdsA(),
      true
    );
  });

  readonly summaryB = computed(() => {
    return this.getHalfSummaryItems(
      this.selectedMenuRecipeB(),
      this.excludedIngredientIdsB(),
      this.additionalIngredientIdsB(),
      true
    );
  });

  readonly summaryTotal = computed(() => {
    if (!this.isHalfAndHalf()) {
      const opt = this.selectedMenuOptionSingle();
      if (!opt) return 0;
      const sum = this.summarySingle();
      return opt.price - sum.excludedTotal + sum.additionalTotal;
    } else {
      const optA = this.selectedMenuOptionA();
      const optB = this.selectedMenuOptionB();
      if (!optA || !optB) return 0;

      const sumA = this.summaryA();
      const sumB = this.summaryB();

      const basePrice = (optA.price + optB.price) / 2;
      return basePrice - sumA.excludedTotal + sumA.additionalTotal - sumB.excludedTotal + sumB.additionalTotal;
    }
  });

  readonly cartTotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.total, 0)
  );

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

  selectMenuOption(id: string): void {
    this.selectedPriceId.set(id);
    this.excludedIngredientIds.set([]);
    this.additionalIngredientIds.set([]);
  }

  setHalfAndHalf(value: boolean): void {
    this.isHalfAndHalf.set(value);
    if (value) {
      if (this.selectedPriceId()) {
        this.selectedPriceIdA.set(this.selectedPriceId());
        this.excludedIngredientIdsA.set([...this.excludedIngredientIds()]);
        this.additionalIngredientIdsA.set([...this.additionalIngredientIds()]);
      }
      this.activeHalf.set('B');
      this.customizingHalf.set('A');
    } else {
      if (this.selectedPriceIdA()) {
        this.selectedPriceId.set(this.selectedPriceIdA());
        this.excludedIngredientIds.set([...this.excludedIngredientIdsA()]);
        this.additionalIngredientIds.set([...this.additionalIngredientIdsA()]);
      }
    }
  }

  setActiveHalf(half: 'A' | 'B'): void {
    this.activeHalf.set(half);
    this.customizingHalf.set(half);
  }

  setCustomizingHalf(half: 'A' | 'B'): void {
    this.customizingHalf.set(half);
  }

  isOptionSelected(id: string): boolean {
    if (!this.isHalfAndHalf()) {
      return this.selectedPriceId() === id;
    }
    return this.activeHalf() === 'A' ? this.selectedPriceIdA() === id : this.selectedPriceIdB() === id;
  }

  selectOption(id: string): void {
    if (!this.isHalfAndHalf()) {
      this.selectMenuOption(id);
    } else {
      if (this.activeHalf() === 'A') {
        this.selectedPriceIdA.set(id);
        this.excludedIngredientIdsA.set([]);
        this.additionalIngredientIdsA.set([]);
        if (!this.selectedPriceIdB()) {
          this.activeHalf.set('B');
          this.customizingHalf.set('B');
        }
      } else {
        this.selectedPriceIdB.set(id);
        this.excludedIngredientIdsB.set([]);
        this.additionalIngredientIdsB.set([]);
        if (!this.selectedPriceIdA()) {
          this.activeHalf.set('A');
          this.customizingHalf.set('A');
        }
      }
    }
  }

  private getActiveExcludedSignal() {
    if (!this.isHalfAndHalf()) {
      return this.excludedIngredientIds;
    }
    return this.customizingHalf() === 'A' ? this.excludedIngredientIdsA : this.excludedIngredientIdsB;
  }

  private getActiveExcludedList(): string[] {
    return this.getActiveExcludedSignal()();
  }

  private getActiveAdditionalSignal() {
    if (!this.isHalfAndHalf()) {
      return this.additionalIngredientIds;
    }
    return this.customizingHalf() === 'A' ? this.additionalIngredientIdsA : this.additionalIngredientIdsB;
  }

  private getActiveAdditionalList(): string[] {
    return this.getActiveAdditionalSignal()();
  }

  isIngredientActive(option: IngredientOption): boolean {
    if (option.excludable) {
      return !this.getActiveExcludedList().includes(option.id);
    }
    return this.getActiveAdditionalList().includes(option.id);
  }

  toggleIngredient(option: IngredientOption): void {
    const willActivate = !this.isIngredientActive(option);
    if (option.salsaBase && willActivate && this.activeSalsaCount() >= 1) {
      return;
    }
    if (option.excludable) {
      this.toggleExcludedIngredient(option.id);
    } else if (option.addable) {
      this.toggleAdditionalIngredient(option.id);
    }
  }

  toggleExcludedIngredient(id: string): void {
    this.getActiveExcludedSignal().update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  toggleAdditionalIngredient(id: string): void {
    this.getActiveAdditionalSignal().update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  getIngredientDisplayPrice(option: IngredientOption): number {
    return option.price;
  }

  addToCart(): void {
    if (!this.selectedMenuOption()) return;
    this.cart.update((items) => [...items, this.buildCartItem()]);
    this.resetForm();
    setTimeout(() => {
      document.querySelector('.cart-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  scrollToTop(): void {
    document.querySelector('.hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  handleStickyAction(): void {
    if (this.selectedMenuOption()) {
      this.addToCart();
    } else {
      this.scrollToTop();
    }
  }

  removeFromCart(id: string): void {
    this.cart.update((items) => items.filter((item) => item.id !== id));
  }

  editCartItem(id: string): void {
    const item = this.cart().find((i) => i.id === id);
    if (!item) return;

    this.removeFromCart(id);

    if (!item.isHalfAndHalf) {
      const half = item.single!;
      this.isHalfAndHalf.set(false);
      this.selectedPriceId.set(half.priceId);
      this.excludedIngredientIds.set(half.items.filter((i) => i.excluded).map((i) => i.id));
      this.additionalIngredientIds.set(half.items.filter((i) => i.additional).map((i) => i.id));
    } else {
      this.isHalfAndHalf.set(true);
      this.selectedPriceIdA.set(item.halfA!.priceId);
      this.excludedIngredientIdsA.set(item.halfA!.items.filter((i) => i.excluded).map((i) => i.id));
      this.additionalIngredientIdsA.set(item.halfA!.items.filter((i) => i.additional).map((i) => i.id));
      this.selectedPriceIdB.set(item.halfB!.priceId);
      this.excludedIngredientIdsB.set(item.halfB!.items.filter((i) => i.excluded).map((i) => i.id));
      this.additionalIngredientIdsB.set(item.halfB!.items.filter((i) => i.additional).map((i) => i.id));
      this.activeHalf.set('A');
      this.customizingHalf.set('A');
    }

    this.scrollToTop();
  }

  confirmOrder(): void {
    const toIngredient = (i: CartSummaryIngredient) => i.id;

    const mapHalf = (half: CartHalf) => ({
      priceId: half.priceId,
      excluded: half.items.filter((i) => i.excluded).map(toIngredient),
      additional: half.items.filter((i) => i.additional).map(toIngredient),
    });

    const payload = {
      items: this.cart().map((item) => ({
        halves: item.isHalfAndHalf
          ? [mapHalf(item.halfA!), mapHalf(item.halfB!)]
          : [mapHalf(item.single!)],
      })),
    };

    console.log('[Order] Datos a guardar:', payload);
  }

  private buildCartItem(): CartItem {
    const id = crypto.randomUUID();
    if (!this.isHalfAndHalf()) {
      const opt = this.selectedMenuOptionSingle()!;
      const summary = this.summarySingle();
      return {
        id,
        isHalfAndHalf: false,
        single: {
          priceId: opt.id!,
          name: opt.name,
          basePrice: opt.price,
          items: summary.items.map((i) => ({
            id: i.id,
            label: i.label,
            size: i.size,
            price: summary.getEffectivePrice(i),
            excluded: i.excluded,
            additional: i.additional,
          })),
        },
        total: this.summaryTotal(),
      };
    }
    const optA = this.selectedMenuOptionA()!;
    const optB = this.selectedMenuOptionB()!;
    const sumA = this.summaryA();
    const sumB = this.summaryB();
    return {
      id,
      isHalfAndHalf: true,
      halfA: {
        priceId: optA.id!,
        name: optA.name,
        basePrice: optA.price / 2,
        items: sumA.items.map((i) => ({
          id: i.id,
          label: i.label,
          size: i.size,
          price: sumA.getEffectivePrice(i),
          excluded: i.excluded,
          additional: i.additional,
        })),
      },
      halfB: {
        priceId: optB.id!,
        name: optB.name,
        basePrice: optB.price / 2,
        items: sumB.items.map((i) => ({
          id: i.id,
          label: i.label,
          size: i.size,
          price: sumB.getEffectivePrice(i),
          excluded: i.excluded,
          additional: i.additional,
        })),
      },
      total: this.summaryTotal(),
    };
  }

  private resetForm(): void {
    this.isHalfAndHalf.set(false);
    this.selectedPriceId.set(null);
    this.excludedIngredientIds.set([]);
    this.additionalIngredientIds.set([]);
    this.selectedPriceIdA.set(null);
    this.selectedPriceIdB.set(null);
    this.excludedIngredientIdsA.set([]);
    this.excludedIngredientIdsB.set([]);
    this.additionalIngredientIdsA.set([]);
    this.additionalIngredientIdsB.set([]);
    this.activeHalf.set('A');
    this.customizingHalf.set('A');
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

  private ceilTo1000(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.ceil(value / 100) * 100;
  }
}
