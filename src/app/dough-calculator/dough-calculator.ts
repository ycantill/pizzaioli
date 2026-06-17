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
import { CostsDataService } from '../services/costs-data.service';
import { DoughsDataService } from '../services/doughs-data.service';
import { DoughCalculationService } from '../services/dough-calculation.service';
import { getCostName } from '../shared/lookup.utils';

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
  private costsService = inject(CostsDataService);
  private doughsService = inject(DoughsDataService);
  private doughCalcService = inject(DoughCalculationService);
  @ViewChild('ingredientsContent') ingredientsContent?: ElementRef;

  costs = this.costsService.costs;
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
      const costs = this.costsService.costs();
      if (costs.length > 0 && this.ingredients().length === 0 && !this.selectedDoughId()) {
        const flourCost = costs.find(c => c.product.toLowerCase().includes('harina'));
        if (flourCost?.id) {
          this.ingredients.set([{ costId: flourCost.id, bakerPercentage: 100 }]);
        }
      }
    });
  }

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);

    if (!doughId) {
      const flourCost = this.costs().find(c => c.product.toLowerCase().includes('harina'));
      if (flourCost?.id) {
        this.ingredients.set([{ costId: flourCost.id, bakerPercentage: 100 }]);
      }
      return;
    }

    const selectedDough = this.doughs().find(d => d.id === doughId);
    if (selectedDough) {
      const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(selectedDough, this.costs());
      if (bakerPercentages.length > 0) {
        this.ingredients.set(bakerPercentages.map(bp => ({
          costId: bp.costId,
          bakerPercentage: bp.bakerPercentage
        })));
      }
    }
  }

  getCostName(costId: string): string {
    return getCostName(this.costs(), costId, 'Seleccionar...');
  }

  isFlour(costId: string): boolean {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product.toLowerCase().includes('harina') : false;
  }

  getAvailableCostsForIngredient(currentCostId: string) {
    const usedCostIds = this.ingredients()
      .map(ing => ing.costId)
      .filter(id => id !== currentCostId);
    return this.costs().filter(c => c.id === currentCostId || !usedCostIds.includes(c.id!));
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
    const usedCostIds = this.ingredients().map(ing => ing.costId);
    const firstCost = this.costs().find(c => !usedCostIds.includes(c.id!));
    if (firstCost?.id) {
      this.ingredients.update(list => [...list, { costId: firstCost.id!, bakerPercentage: 0 }]);
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

  updateIngredientCost(index: number, costId: string) {
    this.ingredients.update(list =>
      list.map((ing, i) => i === index ? { ...ing, costId } : ing)
    );
  }

  updateIngredientPercentage(index: number, percentage: number) {
    this.ingredients.update(list =>
      list.map((ing, i) => i === index ? { ...ing, bakerPercentage: percentage } : ing)
    );
  }
}
