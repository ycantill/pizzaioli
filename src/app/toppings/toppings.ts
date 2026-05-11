import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { ToppingDialog } from './topping-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-toppings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './toppings.html',
  styleUrl: './toppings.css'
})
export class Toppings implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  toppings = signal<Topping[]>([]);
  costs = signal<Cost[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['ingredient', 'quantity', 'size', 'actions'];

  async ngOnInit() {
    await Promise.all([this.loadCosts(), this.loadUnits()]);
    await this.loadToppings();
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
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

  async loadToppings() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('toppings');
      this.toppings.set(data as Topping[]);
    } catch (error) {
      console.error('Error loading toppings:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  getUnitAbbreviation(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    if (!cost) return '';
    const unit = this.units().find(u => u.id === cost.unitId);
    return unit ? unit.abbreviation : '';
  }

  addTopping() {
    const dialogRef = this.dialog.open(ToppingDialog, {
      width: '400px',
      data: { costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Topping | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('toppings', result);
          this.toppings.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding topping:', error);
        }
      }
    });
  }

  editTopping(topping: Topping) {
    const dialogRef = this.dialog.open(ToppingDialog, {
      width: '400px',
      data: { topping, costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Topping | undefined) => {
      if (result && topping.id) {
        try {
          await this.firestoreService.updateDocument('toppings', topping.id, result);
          this.toppings.update(list =>
            list.map(t => t.id === topping.id ? { ...result, id: topping.id } : t)
          );
        } catch (error) {
          console.error('Error updating topping:', error);
        }
      }
    });
  }

  async deleteTopping(topping: Topping) {
    if (!topping.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar este topping?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('toppings', topping.id!);
          this.toppings.update(list => list.filter(t => t.id !== topping.id));
        } catch (error) {
          console.error('Error deleting topping:', error);
        }
      }
    });
  }
}
