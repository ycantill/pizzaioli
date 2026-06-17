import { Component, signal, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Packaging } from '../models/packaging.model';
import { RecipeType } from '../models/recipe-type.model';
import { Cost } from '../models/cost.model';
import { CostType } from '../models/cost-type.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { PackagingDialog } from './packaging-dialog';
import { getCostName } from '../shared/lookup.utils';

@Component({
  selector: 'app-packaging',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './packaging.html',
  styleUrl: './packaging.css'
})
export class PackagingConfig implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  packagings = signal<Packaging[]>([]);
  recipeTypes = signal<RecipeType[]>([]);
  costs = signal<Cost[]>([]);
  costTypes = signal<CostType[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'items', 'actions'];

  async ngOnInit() {
    await Promise.all([
      this.loadRecipeTypes(),
      this.loadCostTypes(),
      this.loadCosts(),
      this.loadUnits(),
      this.loadPackagings()
    ]);
  }

  async loadRecipeTypes() {
    try {
      const data = await this.firestoreService.getDocuments('recipe-types');
      this.recipeTypes.set(data as RecipeType[]);
    } catch (error) {
      console.error('Error loading recipe types:', error);
    }
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

  async loadPackagings() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('packagings');
      this.packagings.set(data as Packaging[]);
    } catch (error) {
      console.error('Error loading packagings:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  getCostName(costId: string): string {
    return getCostName(this.costs(), costId);
  }

  getPackagingForType(recipeTypeId: string): Packaging | undefined {
    return this.packagings().find(d => d.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingPackaging = this.getPackagingForType(recipeType.id!);
    
    // Filtrar costos que NO sean ingredientes
    const ingredienteType = this.costTypes().find(t => t.name.toLowerCase() === 'ingrediente');
    const filteredCosts = ingredienteType
      ? this.costs().filter(cost => cost.typeId !== ingredienteType.id)
      : this.costs();
    
    const dialogRef = this.dialog.open(PackagingDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        packaging: existingPackaging,
        recipeType: recipeType,
        costs: filteredCosts,
        units: this.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Packaging | undefined) => {
      if (result) {
        if (existingPackaging?.id) {
          await this.updatePackaging(existingPackaging.id, result);
        } else {
          await this.addPackaging(result);
        }
      }
    });
  }

  async addPackaging(packaging: Packaging) {
    try {
      const docRef = await this.firestoreService.addDocument('packagings', packaging);
      this.packagings.update(list => [...list, { ...packaging, id: docRef.id }]);
    } catch (error) {
      console.error('Error adding packaging:', error);
    }
  }

  async updatePackaging(id: string, packaging: Packaging) {
    try {
      await this.firestoreService.updateDocument('packagings', id, packaging);
      this.packagings.update(list => 
        list.map(d => d.id === id ? { ...packaging, id } : d)
      );
    } catch (error) {
      console.error('Error updating packaging:', error);
    }
  }

  async deletePackaging(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta configuración de paquetería?')) {
      try {
        await this.firestoreService.deleteDocument('packagings', id);
        this.packagings.update(list => list.filter(d => d.id !== id));
      } catch (error) {
        console.error('Error deleting packaging:', error);
      }
    }
  }
}
