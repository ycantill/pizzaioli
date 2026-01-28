import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Margin } from '../models/margin.model';
import { Cost } from '../models/cost.model';

export interface MarginDialogData {
  margin?: Margin;
  costs: Cost[];
}

@Component({
  selector: 'app-margin-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.margin ? 'Editar' : 'Nuevo' }} Margen</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Costo</mat-label>
          <mat-select formControlName="costId">
            @for (cost of data.costs; track cost.id) {
              <mat-option [value]="cost.id">{{ cost.product }}</mat-option>
            }
          </mat-select>
          @if (form.get('costId')?.hasError('required')) {
            <mat-error>El costo es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Recuperación (%)</mat-label>
          <input matInput type="number" formControlName="recoveryPercentage" placeholder="100">
          <mat-hint>Porcentaje para recuperar inversión</mat-hint>
          @if (form.get('recoveryPercentage')?.hasError('required')) {
            <mat-error>El porcentaje es requerido</mat-error>
          }
          @if (form.get('recoveryPercentage')?.hasError('min')) {
            <mat-error>El valor debe ser mayor o igual a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reinversión (%)</mat-label>
          <input matInput type="number" formControlName="reinvestmentPercentage" placeholder="100">
          <mat-hint>Porcentaje para reinversión</mat-hint>
          @if (form.get('reinvestmentPercentage')?.hasError('required')) {
            <mat-error>El porcentaje es requerido</mat-error>
          }
          @if (form.get('reinvestmentPercentage')?.hasError('min')) {
            <mat-error>El valor debe ser mayor o igual a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ganancia (%)</mat-label>
          <input matInput type="number" formControlName="profitPercentage" placeholder="100">
          <mat-hint>Porcentaje de ganancia personal</mat-hint>
          @if (form.get('profitPercentage')?.hasError('required')) {
            <mat-error>El porcentaje es requerido</mat-error>
          }
          @if (form.get('profitPercentage')?.hasError('min')) {
            <mat-error>El valor debe ser mayor o igual a 0</mat-error>
          }
        </mat-form-field>

        <div class="total-display">
          <span class="total-label">Margen Total:</span>
          <span class="total-value">{{ getTotalMargin() }}%</span>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" 
              (click)="onSave()" 
              [disabled]="!form.valid">
        {{ data.margin ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
      padding-top: 20px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .total-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
      margin-top: 8px;
    }

    .total-label {
      font-size: 16px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .total-value {
      font-size: 20px;
      font-weight: 600;
      color: #1976d2;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class MarginDialog {
  data: MarginDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MarginDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    costId: [this.data.margin?.costId || '', Validators.required],
    recoveryPercentage: [this.data.margin?.recoveryPercentage || 100, [Validators.required, Validators.min(0)]],
    reinvestmentPercentage: [this.data.margin?.reinvestmentPercentage || 100, [Validators.required, Validators.min(0)]],
    profitPercentage: [this.data.margin?.profitPercentage || 100, [Validators.required, Validators.min(0)]]
  });

  getTotalMargin(): number {
    const recovery = this.form.get('recoveryPercentage')?.value || 0;
    const reinvestment = this.form.get('reinvestmentPercentage')?.value || 0;
    const profit = this.form.get('profitPercentage')?.value || 0;
    return recovery + reinvestment + profit;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const margin: Margin = {
        ...this.data.margin,
        ...this.form.value as { costId: string; recoveryPercentage: number; reinvestmentPercentage: number; profitPercentage: number }
      };
      this.dialogRef.close(margin);
    }
  }
}
