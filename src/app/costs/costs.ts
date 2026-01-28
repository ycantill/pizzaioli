import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { CostDialog } from './cost-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-costs',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './costs.html',
  styleUrl: './costs.css'
})
export class Costs implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  costs = signal<Cost[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['product', 'value', 'unit', 'actions'];

  async ngOnInit() {
    await this.loadUnits();
    await this.loadCosts();
  }

  async loadUnits() {
    try {
      const data = await this.firestoreService.getDocuments('units');
      this.units.set(data as Unit[]);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  }

  async loadCosts() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getUnitName(unitId: string): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit ? unit.name : unitId;
  }

  addCost() {
    const dialogRef = this.dialog.open(CostDialog, {
      width: '400px',
      data: { units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Cost | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('costs', result);
          this.costs.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding cost:', error);
        }
      }
    });
  }

  editCost(cost: Cost) {
    const dialogRef = this.dialog.open(CostDialog, {
      width: '400px',
      data: { cost, units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Cost | undefined) => {
      if (result && cost.id) {
        try {
          await this.firestoreService.updateDocument('costs', cost.id, result);
          this.costs.update(list => 
            list.map(c => c.id === cost.id ? { ...result, id: cost.id } : c)
          );
        } catch (error) {
          console.error('Error updating cost:', error);
        }
      }
    });
  }

  async deleteCost(cost: Cost) {
    if (!cost.id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${cost.product}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('costs', cost.id!);
          this.costs.update(list => list.filter(c => c.id !== cost.id));
        } catch (error) {
          console.error('Error deleting cost:', error);
        }
      }
    });
  }
}
