import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FirestoreService } from '../firestore.service';
import { Price } from '../models/price.model';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { Margin } from '../models/margin.model';

interface ToppingOption {
  id: string;
  label: string;
  extraPrice: number;
}

@Component({
  selector: 'app-order',
  imports: [CurrencyPipe],
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
    const sizeWeight: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 };

    return this.toppings()
      .filter((topping): topping is Topping & { id: string } => !!topping.id)
      .map((topping) => {
        const cost = costs.find((item) => item.id === topping.costId);
        const margin = margins.find((item) => item.costId === topping.costId);
        const marginPercent = margin
          ? margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage
          : 0;

        const baseCost = topping.quantity * (cost?.value ?? 0);
        const extraPrice = Math.round(baseCost * (marginPercent / 100) * 100) / 100;
        const productName = cost?.product ?? 'Ingrediente';

        return {
          id: topping.id,
          label: `${productName} (${topping.size})`,
          extraPrice,
        };
      })
      .sort((a, b) => {
        const nameDiff = a.label.localeCompare(b.label, 'es');
        if (nameDiff !== 0) {
          return nameDiff;
        }

        const sizeA = a.label.match(/\((S|M|L|XL)\)$/)?.[1] ?? 'XL';
        const sizeB = b.label.match(/\((S|M|L|XL)\)$/)?.[1] ?? 'XL';
        return (sizeWeight[sizeA] ?? 99) - (sizeWeight[sizeB] ?? 99);
      });
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
    return this.toppingOptions().filter((option) => selected.has(option.id));
  });

  readonly additionalOptions = computed(() => {
    const selected = new Set(this.additionalIngredientIds());
    return this.toppingOptions().filter((option) => selected.has(option.id));
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
      const [prices, toppings, costs, margins] = await Promise.all([
        this.firestoreService.getDocuments('prices'),
        this.firestoreService.getDocuments('toppings'),
        this.firestoreService.getDocuments('costs'),
        this.firestoreService.getDocuments('margins'),
      ]);

      this.prices.set(prices as Price[]);
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
  }

  toggleExcludedIngredient(id: string): void {
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
}
