import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Dough } from '../models/dough.model';
import { Cost } from '../models/cost.model';
import { CostType } from '../models/cost-type.model';
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
  costs = signal<Cost[]>([]);
  costTypes = signal<CostType[]>([]);
  loading = signal(true);
  migrating = signal(false);
  displayedColumns: string[] = ['name', 'ballWeight', 'ingredients', 'actions'];

  async ngOnInit() {
    await this.loadCostTypes();
    await this.loadCosts();
    await this.loadDoughs();
  }

  async loadCostTypes() {
    try {
      const data = await this.firestoreService.getDocuments('cost-types');
      this.costTypes.set(data as CostType[]);
    } catch (error) {
      console.error('Error loading cost types:', error);
    }
  }

  async loadCosts() {
    try {
      const allCosts = await this.firestoreService.getDocuments('costs') as Cost[];
      const types = this.costTypes();
      const ingredienteType = types.find(t => t.name.toLowerCase() === 'ingrediente');
      
      // Filtrar solo ingredientes
      const ingredientCosts = ingredienteType 
        ? allCosts.filter(cost => cost.typeId === ingredienteType.id)
        : allCosts;
      
      this.costs.set(ingredientCosts);
    } catch (error) {
      console.error('Error loading costs:', error);
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

  async migrateDefaultBallWeight() {
    try {
      this.migrating.set(true);
      let updated = 0;

      for (const dough of this.doughs()) {
        if (dough.id && !dough.ballWeight) {
          await this.firestoreService.updateDocument('doughs', dough.id, { ballWeight: 250 });
          updated++;
        }
      }

      console.log(`Migración completada: ${updated} masas actualizadas con peso por defecto de 250g`);
      await this.loadDoughs();
    } catch (error) {
      console.error('Error en migración:', error);
    } finally {
      this.migrating.set(false);
    }
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  addDough() {
    const dialogRef = this.dialog.open(DoughDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { 
        costs: this.costs()
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
        costs: this.costs()
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
