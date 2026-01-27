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
import { Supply } from '../models/supply.model';
import { FirestoreService } from '../firestore.service';

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
  @ViewChild('ingredientsContent') ingredientsContent?: ElementRef;
  
  supplies = signal<Supply[]>([]);
  doughs = signal<Dough[]>([]);
  selectedDoughId = signal<string | null>(null);
  weightPerUnit = signal(250);
  quantity = signal(10);
  ingredients = signal<DoughIngredient[]>([]);

  displayedColumns: string[] = ['name', 'percentage', 'weight', 'actions'];

  async ngOnInit() {
    await this.loadSupplies();
    await this.loadDoughs();
  }

  async loadSupplies() {
    try {
      const data = await this.firestoreService.getDocuments('supplies');
      this.supplies.set(data as Supply[]);
      
      // Add flour by default at 100% only if no dough is selected
      if (this.ingredients().length === 0 && !this.selectedDoughId()) {
        const flourSupply = (data as Supply[]).find(s => 
          s.product.toLowerCase().includes('harina')
        );
        if (flourSupply?.id) {
          this.ingredients.set([{
            supplyId: flourSupply.id,
            bakerPercentage: 100
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading supplies:', error);
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
      const flourSupply = this.supplies().find(s => 
        s.product.toLowerCase().includes('harina')
      );
      if (flourSupply?.id) {
        this.ingredients.set([{
          supplyId: flourSupply.id,
          bakerPercentage: 100
        }]);
      }
      return;
    }

    const selectedDough = this.doughs().find(d => d.id === doughId);
    if (selectedDough) {
      // Convert dough ingredients to calculator ingredients with baker's percentage
      const doughIngredients = selectedDough.ingredients;
      
      // Find flour to calculate percentages
      const flourIngredient = doughIngredients.find(ing => {
        const supply = this.supplies().find(s => s.id === ing.supplyId);
        return supply?.product.toLowerCase().includes('harina');
      });

      if (flourIngredient) {
        const flourWeight = flourIngredient.quantity;
        const calculatorIngredients: DoughIngredient[] = doughIngredients.map(ing => ({
          supplyId: ing.supplyId,
          bakerPercentage: Math.round((ing.quantity / flourWeight * 100) * 100) / 100
        }));
        this.ingredients.set(calculatorIngredients);
      }
    }
  }

  getSupplyName(supplyId: string): string {
    const supply = this.supplies().find(s => s.id === supplyId);
    return supply ? supply.product : 'Seleccionar...';
  }

  isFlour(supplyId: string): boolean {
    const supply = this.supplies().find(s => s.id === supplyId);
    return supply ? supply.product.toLowerCase().includes('harina') : false;
  }

  getAvailableSuppliesForIngredient(currentSupplyId: string): Supply[] {
    const usedSupplyIds = this.ingredients()
      .map(ing => ing.supplyId)
      .filter(id => id !== currentSupplyId);
    
    return this.supplies().filter(s => 
      s.id === currentSupplyId || !usedSupplyIds.includes(s.id!)
    );
  }

  flourWeight = computed(() => this.weightPerUnit() * this.quantity());

  calculatedIngredients = computed(() => {
    const flour = this.flourWeight();
    return this.ingredients().map(ing => ({
      ...ing,
      calculatedWeight: Math.round((flour * ing.bakerPercentage / 100) * 10) / 10
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
    const usedSupplyIds = this.ingredients().map(ing => ing.supplyId);
    const available = this.supplies().filter(s => 
      !usedSupplyIds.includes(s.id!)
    );
    const firstSupply = available[0];
    if (firstSupply?.id) {
      this.ingredients.update(list => [...list, {
        supplyId: firstSupply.id!,
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

  updateIngredientSupply(index: number, supplyId: string) {
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
