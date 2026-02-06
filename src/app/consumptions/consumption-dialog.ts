import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';

export interface ConsumptionDialogData {
  consumption?: Consumption;
  costs: Cost[];
  units: Unit[];
}

@Component({
  selector: 'app-consumption-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.consumption ? 'Editar' : 'Nuevo' }} Consumo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-container">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Preparación de masa">
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Servicio</mat-label>
          <mat-select formControlName="costId" (selectionChange)="onCostChange()">
            @for (cost of data.costs; track cost.id) {
              <mat-option [value]="cost.id">{{ cost.product }}</mat-option>
            }
          </mat-select>
          @if (form.get('costId')?.hasError('required') && form.get('costId')?.touched) {
            <mat-error>El servicio es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cantidad por hora{{ getUnitLabel() }}</mat-label>
          <input matInput type="number" formControlName="quantity" min="0.1" step="0.1">
          @if (form.get('quantity')?.hasError('required') && form.get('quantity')?.touched) {
            <mat-error>La cantidad es requerida</mat-error>
          }
          @if (form.get('quantity')?.hasError('min')) {
            <mat-error>La cantidad debe ser mayor a 0</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px 24px;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
    }

    mat-form-field {
      width: 100%;
    }

    @media (max-width: 600px) {
      .form-container {
        min-width: auto;
      }
    }
  `]
})
export class ConsumptionDialog {
  data: ConsumptionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConsumptionDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.consumption?.name || '', Validators.required],
    costId: [this.data.consumption?.costId || '', Validators.required],
    quantity: [this.data.consumption?.quantity || 1, [Validators.required, Validators.min(0.1)]]
  });

  getCost(costId: string): Cost | undefined {
    return this.data.costs.find(c => c.id === costId);
  }

  getUnitLabel(): string {
    const costId = this.form.get('costId')?.value;
    if (!costId) return '';
    
    const cost = this.getCost(costId);
    if (!cost) return '';
    
    const unit = this.data.units.find(u => u.id === cost.unitId);
    return unit ? ` (${unit.name})` : '';
  }

  onCostChange(): void {
    // Trigger change detection to update unit label
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const consumption: Consumption = this.form.value as Consumption;
      this.dialogRef.close(consumption);
    }
  }
}
