import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CostType } from '../models/cost-type.model';
import { FirestoreService } from '../firestore.service';
import { CostTypeDialog } from './cost-type-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-cost-types',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './cost-types.html',
  styleUrl: './cost-types.css'
})
export class CostTypes implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  costTypes = signal<CostType[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'actions'];

  async ngOnInit() {
    await this.loadCostTypes();
  }

  async loadCostTypes() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('cost-types');
      this.costTypes.set(data as CostType[]);
    } catch (error) {
      console.error('Error loading cost types:', error);
    } finally {
      this.loading.set(false);
    }
  }

  addCostType() {
    const dialogRef = this.dialog.open(CostTypeDialog, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(async (result: CostType | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('cost-types', result);
          this.costTypes.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding cost type:', error);
        }
      }
    });
  }

  editCostType(costType: CostType) {
    const dialogRef = this.dialog.open(CostTypeDialog, {
      width: '400px',
      data: { costType }
    });

    dialogRef.afterClosed().subscribe(async (result: CostType | undefined) => {
      if (result && costType.id) {
        try {
          await this.firestoreService.updateDocument('cost-types', costType.id, result);
          this.costTypes.update(list => 
            list.map(t => t.id === costType.id ? { ...result, id: costType.id } : t)
          );
        } catch (error) {
          console.error('Error updating cost type:', error);
        }
      }
    });
  }

  deleteCostType(costType: CostType) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el tipo "${costType.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && costType.id) {
        try {
          await this.firestoreService.deleteDocument('cost-types', costType.id);
          this.costTypes.update(list => list.filter(t => t.id !== costType.id));
        } catch (error) {
          console.error('Error deleting cost type:', error);
        }
      }
    });
  }
}
