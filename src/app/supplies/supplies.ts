import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';

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
    // TODO: Implement add dialog
    console.log('Add supply');
  }

  editSupply(supply: Supply) {
    // TODO: Implement edit dialog
    console.log('Edit supply:', supply);
  }

  async deleteSupply(supply: Supply) {
    if (!supply.id) return;
    
    try {
      await this.firestoreService.deleteDocument('supplies', supply.id);
      this.supplies.update(list => list.filter(s => s.id !== supply.id));
    } catch (error) {
      console.error('Error deleting supply:', error);
    }
  }
}
