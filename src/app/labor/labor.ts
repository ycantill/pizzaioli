import { Component, signal, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Labor } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';
import { FirestoreService } from '../firestore.service';
import { LaborDialog } from './labor-dialog';

@Component({
  selector: 'app-labor',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './labor.html',
  styleUrl: './labor.css'
})
export class LaborConfig implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  labors = signal<Labor[]>([]);
  recipeTypes = signal<RecipeType[]>([]);
  consumptions = signal<Consumption[]>([]);
  costs = signal<Cost[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'items', 'actions'];

  async ngOnInit() {
    try {
      const [recipeTypes, consumptions, costs, labors] = await Promise.all([
        this.firestoreService.getDocuments('recipe-types'),
        this.firestoreService.getDocuments('consumptions'),
        this.firestoreService.getDocuments('costs'),
        this.firestoreService.getDocuments('labors')
      ]);
      this.recipeTypes.set(recipeTypes as RecipeType[]);
      this.consumptions.set(consumptions as Consumption[]);
      this.costs.set(costs as Cost[]);
      this.labors.set(labors as Labor[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getConsumptionName(consumptionId: string): string {
    const consumption = this.consumptions().find(c => c.id === consumptionId);
    return consumption ? consumption.name : 'Desconocido';
  }

  formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  }

  getLaborForType(recipeTypeId: string): Labor | undefined {
    return this.labors().find(l => l.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingLabor = this.getLaborForType(recipeType.id!);

    const dialogRef = this.dialog.open(LaborDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        labor: existingLabor,
        recipeType,
        consumptions: this.consumptions(),
        costs: this.costs()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Labor | undefined) => {
      if (result) {
        if (existingLabor?.id) {
          await this.updateLabor(existingLabor.id, result);
        } else {
          await this.addLabor(result);
        }
      }
    });
  }

  async addLabor(labor: Labor) {
    try {
      const docRef = await this.firestoreService.addDocument('labors', labor);
      this.labors.update(list => [...list, { ...labor, id: docRef.id }]);
    } catch (error) {
      console.error('Error adding labor:', error);
    }
  }

  async updateLabor(id: string, labor: Labor) {
    try {
      await this.firestoreService.updateDocument('labors', id, labor);
      this.labors.update(list =>
        list.map(l => l.id === id ? { ...labor, id } : l)
      );
    } catch (error) {
      console.error('Error updating labor:', error);
    }
  }

  async deleteLabor(id: string) {
    try {
      await this.firestoreService.deleteDocument('labors', id);
      this.labors.update(list => list.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting labor:', error);
    }
  }
}
