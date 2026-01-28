import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { DoughIngredient, Dough } from '../models/dough.model';
import { Cost } from '../models/cost.model';
import { FirestoreService } from '../firestore.service';
import { DoughCalculationService } from '../services/dough-calculation.service';

@Component({
  selector: 'app-dough-calculator',
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
export class DoughCalculator implements OnInit {
  private firestoreService = inject(FirestoreService);
  private doughCalcService = inject(DoughCalculationService);
  @ViewChild('ingredientsContent') ingredientsContent?: ElementRef;
  
  costs = signal<Cost[]>([]);
  doughs = signal<Dough[]>([]);
  selectedDoughId = signal<string | null>(null);
  weightPerUnit = signal(250);
  quantity = signal(10);
  ingredients = signal<DoughIngredient[]>([]);

  displayedColumns: string[] = ['name', 'percentage', 'weight', 'actions'];

  async ngOnInit() {
    await this.loadCosts();
    await this.loadDoughs();
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
      
      // Add flour by default at 100% only if no dough is selected
      if (this.ingredients().length === 0 && !this.selectedDoughId()) {
        const flourCost = (data as Cost[]).find(c => 
          c.product.toLowerCase().includes('harina')
        );
        if (flourCost?.id) {
          this.ingredients.set([{
            costId: flourCost.id,
            bakerPercentage: 100
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading costs:', error);
    }
  }

  async loadDoughs() {
    try {
      const data = await this.firestoreService.getDocuments('doughs');
      this.doughs.set(data as Dough[]);
    } catch (error) {
      console.error('Error loading doughs:', error);
    }
  }

  onDoughSelected(doughId: string | null) {
    this.selectedDoughId.set(doughId);
    
    if (!doughId) {
      // Reset to default flour
      const flourCost = this.costs().find(c => 
        c.product.toLowerCase().includes('harina')
      );
      if (flourCost?.id) {
        this.ingredients.set([{
          costId: flourCost.id,
          bakerPercentage: 100
        }]);
      }
      return;
    }

    const selectedDough = this.doughs().find(d => d.id === doughId);
    if (selectedDough) {
      const bakerPercentages = this.doughCalcService.getDoughBakerPercentages(
        selectedDough,
        this.costs()
      );
      
      if (bakerPercentages.length > 0) {
        this.ingredients.set(bakerPercentages.map(bp => ({
          costId: bp.costId,
          bakerPercentage: bp.bakerPercentage
        })));
      }
    }
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Seleccionar...';
  }

  isFlour(costId: string): boolean {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product.toLowerCase().includes('harina') : false;
  }

  getAvailableCostsForIngredient(currentCostId: string): Cost[] {
    const usedCostIds = this.ingredients()
      .map(ing => ing.costId)
      .filter(id => id !== currentCostId);
    
    return this.costs().filter(c => 
      c.id === currentCostId || !usedCostIds.includes(c.id!)
    );
  }

  // Calculate ingredient multiplier using correct formula
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

  totalWeight = computed(() => {
    return this.calculatedIngredients().reduce((sum, ing) => 
      sum + (ing.calculatedWeight || 0), 0
    );
  });

  totalPercentage = computed(() => {
    return this.ingredients().reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  });

  addIngredient() {
    const usedCostIds = this.ingredients().map(ing => ing.costId);
    const available = this.costs().filter(c => 
      !usedCostIds.includes(c.id!)
    );
    const firstCost = available[0];
    if (firstCost?.id) {
      this.ingredients.update(list => [...list, {
        costId: firstCost.id!,
        bakerPercentage: 0
      }]);
      
      // Scroll to bottom after adding
      setTimeout(() => {
        if (this.ingredientsContent) {
          const element = this.ingredientsContent.nativeElement;
          element.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
