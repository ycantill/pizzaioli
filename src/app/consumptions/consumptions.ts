import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';
import { CostType } from '../models/cost-type.model';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { ConsumptionDialog } from './consumption-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-consumptions',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './consumptions.html',
  styleUrl: './consumptions.css'
})
export class Consumptions implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  consumptions = signal<Consumption[]>([]);
  costs = signal<Cost[]>([]);
  costTypes = signal<CostType[]>([]);
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'service', 'quantity', 'actions'];

  async ngOnInit() {
    await Promise.all([
      this.loadCostTypes(),
      this.loadCosts(),
      this.loadUnits(),
      this.loadConsumptions()
    ]);
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

  async loadConsumptions() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('consumptions');
      this.consumptions.set(data as Consumption[]);
    } catch (error) {
      console.error('Error loading consumptions:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getServiceCosts(): Cost[] {
    const servicioType = this.costTypes().find(t => t.name.toLowerCase() === 'servicio');
    return servicioType
      ? this.costs().filter(cost => cost.typeId === servicioType.id)
      : [];
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  getUnitName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    if (!cost) return '';
    const unit = this.units().find(u => u.id === cost.unitId);
    return unit ? unit.name : '';
  }

  addConsumption() {
    const dialogRef = this.dialog.open(ConsumptionDialog, {
      width: '500px',
      data: {
        costs: this.getServiceCosts(),
        units: this.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Consumption | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('consumptions', result);
          this.consumptions.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding consumption:', error);
        }
      }
    });
  }

  editConsumption(consumption: Consumption) {
    const dialogRef = this.dialog.open(ConsumptionDialog, {
      width: '500px',
      data: {
        consumption,
        costs: this.getServiceCosts(),
        units: this.units()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Consumption | undefined) => {
      if (result && consumption.id) {
        try {
          await this.firestoreService.updateDocument('consumptions', consumption.id, result);
          this.consumptions.update(list =>
            list.map(c => c.id === consumption.id ? { ...result, id: consumption.id } : c)
          );
        } catch (error) {
          console.error('Error updating consumption:', error);
        }
      }
    });
  }

  async deleteConsumption(consumption: Consumption) {
    if (!consumption.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar este consumo?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('consumptions', consumption.id!);
          this.consumptions.update(list => list.filter(c => c.id !== consumption.id));
        } catch (error) {
          console.error('Error deleting consumption:', error);
        }
      }
    });
  }
}
