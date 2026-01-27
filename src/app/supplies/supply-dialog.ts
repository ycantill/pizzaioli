import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';

export interface SupplyDialogData {
  supply?: Supply;
  units: Unit[];
}

@Component({
  selector: 'app-supply-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.supply ? 'Editar' : 'Nueva' }} Provisión</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Producto</mat-label>
          <input matInput formControlName="product" placeholder="Ej: Harina">
          @if (form.get('product')?.hasError('required')) {
            <mat-error>El producto es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Valor</mat-label>
          <input matInput type="number" formControlName="value" placeholder="0.00">
          @if (form.get('value')?.hasError('required')) {
            <mat-error>El valor es requerido</mat-error>
          }
          @if (form.get('value')?.hasError('min')) {
            <mat-error>El valor debe ser mayor a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unidad</mat-label>
          <mat-select formControlName="unitId">
            @for (unit of data.units; track unit.id) {
              <mat-option [value]="unit.id">{{ unit.name }}</mat-option>
            }
          </mat-select>
          @if (form.get('unitId')?.hasError('required')) {
            <mat-error>La unidad es requerida</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" 
              (click)="onSave()" 
              [disabled]="!form.valid">
        {{ data.supply ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
      padding-top: 20px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class SupplyDialog {
  data: SupplyDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SupplyDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    product: [this.data.supply?.product || '', Validators.required],
    value: [this.data.supply?.value || 0, [Validators.required, Validators.min(0.01)]],
    unitId: [this.data.supply?.unitId || '', Validators.required]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const supply: Supply = {
        ...this.data.supply,
        ...this.form.value as { product: string; value: number; unitId: string }
      };
      this.dialogRef.close(supply);
    }
  }
}
