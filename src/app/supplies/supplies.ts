import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { SupplyDialog } from './supply-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-supplies',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './supplies.html',
  styleUrl: './supplies.css'
})
export class Supplies implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  supplies = signal<Supply[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['product', 'value', 'unit', 'actions'];

  async ngOnInit() {
    await this.loadUnits();
    await this.loadSupplies();
  }

  async loadUnits() {
    try {
      const data = await this.firestoreService.getDocuments('units');
      this.units.set(data as Unit[]);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  }

  async loadSupplies() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('supplies');
      this.supplies.set(data as Supply[]);
    } catch (error) {
      console.error('Error loading supplies:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getUnitName(unitId: string): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit ? unit.name : unitId;
  }

  addSupply() {
    const dialogRef = this.dialog.open(SupplyDialog, {
      width: '400px',
      data: { units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Supply | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('supplies', result);
          this.supplies.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding supply:', error);
        }
      }
    });
  }

  editSupply(supply: Supply) {
    const dialogRef = this.dialog.open(SupplyDialog, {
      width: '400px',
      data: { supply, units: this.units() }
    });

    dialogRef.afterClosed().subscribe(async (result: Supply | undefined) => {
      if (result && supply.id) {
        try {
          await this.firestoreService.updateDocument('supplies', supply.id, result);
          this.supplies.update(list => 
            list.map(s => s.id === supply.id ? { ...result, id: supply.id } : s)
          );
        } catch (error) {
          console.error('Error updating supply:', error);
        }
      }
    });
  }

  async deleteSupply(supply: Supply) {
    if (!supply.id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${supply.product}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('supplies', supply.id!);
          this.supplies.update(list => list.filter(s => s.id !== supply.id));
        } catch (error) {
          console.error('Error deleting supply:', error);
        }
      }
    });
  }
}
