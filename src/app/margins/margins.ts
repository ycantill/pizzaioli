import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Margin } from '../models/margin.model';
import { Cost } from '../models/cost.model';
import { FirestoreService } from '../firestore.service';
import { MarginDialog } from './margin-dialog.component';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-margins',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './margins.html',
  styleUrl: './margins.css'
})
export class Margins implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  margins = signal<Margin[]>([]);
  costs = signal<Cost[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['cost', 'recovery', 'reinvestment', 'profit', 'total', 'actions'];

  async ngOnInit() {
    await this.loadCosts();
    await this.loadMargins();
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
    }
  }

  async loadMargins() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('margins');
      this.margins.set(data as Margin[]);
    } catch (error) {
      console.error('Error loading margins:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getCostName(costId: string): string {
    const cost = this.costs().find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  getTotalMargin(margin: Margin): number {
    return margin.recoveryPercentage + margin.reinvestmentPercentage + margin.profitPercentage;
  }

  addMargin() {
    const dialogRef = this.dialog.open(MarginDialog, {
      width: '500px',
      data: { costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Margin | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('margins', result);
          this.margins.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding margin:', error);
        }
      }
    });
  }

  editMargin(margin: Margin) {
    const dialogRef = this.dialog.open(MarginDialog, {
      width: '500px',
      data: { margin, costs: this.costs() }
    });

    dialogRef.afterClosed().subscribe(async (result: Margin | undefined) => {
      if (result && margin.id) {
        try {
          await this.firestoreService.updateDocument('margins', margin.id, result);
          this.margins.update(list => 
            list.map(m => m.id === margin.id ? { ...result, id: margin.id } : m)
          );
        } catch (error) {
          console.error('Error updating margin:', error);
        }
      }
    });
  }

  async deleteMargin(margin: Margin) {
    if (!margin.id) return;
    
    const costName = this.getCostName(margin.costId);
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el margen de "${costName}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('margins', margin.id!);
          this.margins.update(list => list.filter(m => m.id !== margin.id));
        } catch (error) {
          console.error('Error deleting margin:', error);
        }
      }
    });
  }
}
