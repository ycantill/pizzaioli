import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Dough } from '../models/dough.model';
import { Supply } from '../models/supply.model';
import { FirestoreService } from '../firestore.service';
import { DoughDialog } from './dough-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-doughs',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './doughs.html',
  styleUrl: './doughs.css'
})
export class Doughs implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  doughs = signal<Dough[]>([]);
  supplies = signal<Supply[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'ingredients', 'actions'];

  async ngOnInit() {
    await this.loadSupplies();
    await this.loadDoughs();
  }

  async loadSupplies() {
    try {
      const data = await this.firestoreService.getDocuments('supplies');
      this.supplies.set(data as Supply[]);
    } catch (error) {
      console.error('Error loading supplies:', error);
    }
  }

  async loadDoughs() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('doughs');
      this.doughs.set(data as Dough[]);
    } catch (error) {
      console.error('Error loading doughs:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getSupplyName(supplyId: string): string {
    const supply = this.supplies().find(s => s.id === supplyId);
    return supply ? supply.product : 'Desconocido';
  }

  addDough() {
    const dialogRef = this.dialog.open(DoughDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { 
        supplies: this.supplies()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Dough | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('doughs', result);
          this.doughs.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding dough:', error);
        }
      }
    });
  }

  editDough(dough: Dough) {
    const dialogRef = this.dialog.open(DoughDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { 
        dough,
        supplies: this.supplies()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Dough | undefined) => {
      if (result && dough.id) {
        try {
          await this.firestoreService.updateDocument('doughs', dough.id, result);
          this.doughs.update(list => 
            list.map(d => d.id === dough.id ? { ...result, id: dough.id } : d)
          );
        } catch (error) {
          console.error('Error updating dough:', error);
        }
      }
    });
  }

  async deleteDough(dough: Dough) {
    if (!dough.id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${dough.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('doughs', dough.id!);
          this.doughs.update(list => list.filter(d => d.id !== dough.id));
        } catch (error) {
          console.error('Error deleting dough:', error);
        }
      }
    });
  }
}
