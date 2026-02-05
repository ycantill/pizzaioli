import { Component, signal, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Delivery } from '../models/delivery.model';
import { RecipeType } from '../models/recipe-type.model';
import { Cost } from '../models/cost.model';
import { CostType } from '../models/cost-type.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { DeliveryDialog } from './delivery-dialog';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './delivery.html',
  styleUrl: './delivery.css'
})
export class DeliveryConfig implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  deliveries = signal<Delivery[]>([]);
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
      this.loadDeliveries()
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

  async loadDeliveries() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('deliveries');
      this.deliveries.set(data as Delivery[]);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  getDeliveryForType(recipeTypeId: string): Delivery | undefined {
    return this.deliveries().find(d => d.recipeTypeId === recipeTypeId);
  }

  openDialog(recipeType: RecipeType) {
    const existingDelivery = this.getDeliveryForType(recipeType.id!);
    
    // Filtrar costos que NO sean ingredientes
    const ingredienteType = this.costTypes().find(t => t.name.toLowerCase() === 'ingrediente');
    const filteredCosts = ingredienteType
      ? this.costs().filter(cost => cost.typeId !== ingredienteType.id)
      : this.costs();
    
    const dialogRef = this.dialog.open(DeliveryDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        delivery: existingDelivery,
        recipeType: recipeType,
        costs: filteredCosts,
        units: this.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Delivery | undefined) => {
      if (result) {
        if (existingDelivery?.id) {
          await this.updateDelivery(existingDelivery.id, result);
        } else {
          await this.addDelivery(result);
        }
      }
    });
  }

  async addDelivery(delivery: Delivery) {
    try {
      const docRef = await this.firestoreService.addDocument('deliveries', delivery);
      this.deliveries.update(list => [...list, { ...delivery, id: docRef.id }]);
    } catch (error) {
      console.error('Error adding delivery:', error);
    }
  }

  async updateDelivery(id: string, delivery: Delivery) {
    try {
      await this.firestoreService.updateDocument('deliveries', id, delivery);
      this.deliveries.update(list => 
        list.map(d => d.id === id ? { ...delivery, id } : d)
      );
    } catch (error) {
      console.error('Error updating delivery:', error);
    }
  }

  async deleteDelivery(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta configuración de delivery?')) {
      try {
        await this.firestoreService.deleteDocument('deliveries', id);
        this.deliveries.update(list => list.filter(d => d.id !== id));
      } catch (error) {
        console.error('Error deleting delivery:', error);
      }
    }
  }
}
