import { Component, signal, computed, inject, ViewChild, ElementRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { DoughIngredient } from '../models/dough.model';
import { CatalogService } from '../services/catalog.service';
import { DoughsDataService } from '../services/doughs-data.service';
import { DoughCalculationService } from '../services/dough-calculation.service';

@Component({
  selector: 'app-dough-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
    FormsModule
  ],
  templateUrl: './dough-calculator.html',
  styleUrl: './dough-calculator.css'
})
export class DoughCalculator {
  private catalog = inject(CatalogService);
  private doughsService = inject(DoughsDataService);
  private doughCalcService = inject(DoughCalculationService);
  @ViewChild('ingredientsContent') ingredientsContent?: ElementRef;

  costs = this.catalog.items;
  doughs = this.doughsService.doughs;
  selectedDoughId = signal<string | null>(null);
  weightPerUnit = signal(250);
  quantity = signal(10);
  ingredients = signal<DoughIngredient[]>([]);

  displayedColumns: string[] = ['name', 'percentage', 'weight', 'actions'];

  constructor() {
    effect(() => {
      const doughId = this.selectedDoughId();
      if (doughId) {
        const dough = this.doughs().find(d => d.id === doughId);
        if (dough) {
          this.weightPerUnit.set(dough.ballWeight);
        }
      }
    });

    effect(() => {
      const costs = this.catalog.items();
      if (costs.length > 0 && this.ingredients().length === 0 && !this.selectedDoughId()) {
        const flourCost = costs.find(c => c.name.toLowerCase().includes('harina'));
        if (flourCost?.id) {
          this.ingredients.set([{ supplyId: flourCost.id, bakerPercentage: 100 }]);
        }
      }
    });
  }

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);

    if (!doughId) {
      const flourCost = this.costs().find(c => c.name.toLowerCase().includes('harina'));
      if (flourCost?.id) {
        this.ingredients.set([{ supplyId: flourCost.id, bakerPercentage: 100 }]);
      }
      return;
    }

    const selectedDough = this.doughs().find(d => d.id === doughId);
    if (selectedDough) {
      const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(selectedDough, this.costs());
      if (bakerPercentages.length > 0) {
        this.ingredients.set(bakerPercentages.map(bp => ({
          supplyId: bp.supplyId,
          bakerPercentage: bp.bakerPercentage
        })));
      }
    }
  }

  getCostName(supplyId: string): string {
    return this.catalog.name(supplyId, 'Seleccionar...');
  }

  isFlour(supplyId: string): boolean {
    const item = this.catalog.find(supplyId);
    return item ? item.name.toLowerCase().includes('harina') : false;
  }

  getAvailableCostsForIngredient(currentSupplyId: string) {
    const usedSupplyIds = this.ingredients()
      .map(ing => ing.supplyId)
      .filter(id => id !== currentSupplyId);
    return this.costs().filter(c => c.id === currentSupplyId || !usedSupplyIds.includes(c.id!));
  }

  ingredientMultiplier = computed(() => {
    const totalPercentage = this.totalPercentage();
    if (totalPercentage === 0) return 0;
    return (this.quantity() * this.weightPerUnit()) / totalPercentage;
  });

  calculatedIngredients = computed(() => {
    const multiplier = this.ingredientMultiplier();
    return this.ingredients().map(ing => ({
      ...ing,
      calculatedWeight: Math.round((multiplier * ing.bakerPercentage) * 10) / 10
    }));
  });

  totalWeight = computed(() =>
    this.calculatedIngredients().reduce((sum, ing) => sum + (ing.calculatedWeight || 0), 0)
  );

  totalPercentage = computed(() =>
    this.ingredients().reduce((sum, ing) => sum + ing.bakerPercentage, 0)
  );

  addIngredient() {
    const usedSupplyIds = this.ingredients().map(ing => ing.supplyId);
    const firstCost = this.costs().find(c => !usedSupplyIds.includes(c.id!));
    if (firstCost?.id) {
      this.ingredients.update(list => [...list, { supplyId: firstCost.id!, bakerPercentage: 0 }]);
      setTimeout(() => {
        if (this.ingredientsContent) {
          this.ingredientsContent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
  }

  removeIngredient(index: number) {
    this.ingredients.update(list => list.filter((_, i) => i !== index));
  }

  updateIngredientCost(index: number, supplyId: string) {
    this.ingredients.update(list =>
      list.map((ing, i) => i === index ? { ...ing, supplyId } : ing)
    );
  }

  updateIngredientPercentage(index: number, percentage: number) {
    this.ingredients.update(list =>
      list.map((ing, i) => i === index ? { ...ing, bakerPercentage: percentage } : ing)
    );
  }
}
