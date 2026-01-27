import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Unit } from '../models/unit.model';
import { FirestoreService } from '../firestore.service';
import { UnitDialog } from './unit-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-units',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './units.html',
  styleUrl: './units.css'
})
export class Units implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  units = signal<Unit[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'abbreviation', 'actions'];

  async ngOnInit() {
    await this.loadUnits();
  }

  async loadUnits() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('units');
      this.units.set(data as Unit[]);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      this.loading.set(false);
    }
  }

  addUnit() {
    const dialogRef = this.dialog.open(UnitDialog, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(async (result: Unit | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('units', result);
          this.units.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error('Error adding unit:', error);
        }
      }
    });
  }

  editUnit(unit: Unit) {
    const dialogRef = this.dialog.open(UnitDialog, {
      width: '400px',
      data: { unit }
    });

    dialogRef.afterClosed().subscribe(async (result: Unit | undefined) => {
      if (result && unit.id) {
        try {
          await this.firestoreService.updateDocument('units', unit.id, result);
          this.units.update(list => 
            list.map(u => u.id === unit.id ? { ...result, id: unit.id } : u)
          );
        } catch (error) {
          console.error('Error updating unit:', error);
        }
      }
    });
  }

  async deleteUnit(unit: Unit) {
    if (!unit.id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${unit.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.firestoreService.deleteDocument('units', unit.id!);
          this.units.update(list => list.filter(u => u.id !== unit.id));
        } catch (error) {
          console.error('Error deleting unit:', error);
        }
      }
    });
  }
}
