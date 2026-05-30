import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';
import { CostType } from '../models/cost-type.model';

export interface CostDialogData {
  cost?: Cost;
  units: Unit[];
  costTypes: CostType[];
}

@Component({
  selector: 'app-cost-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.cost ? 'Editar' : 'Nuevo' }} Costo</h2>
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
          <input matInput type="text" inputmode="decimal" formControlName="value" placeholder="0.00">
          @if (form.get('value')?.hasError('required')) {
            <mat-error>El valor es requerido</mat-error>
          }
          @if (form.get('value')?.hasError('invalidNumber')) {
            <mat-error>Ingrese un número válido (ej: 1.50)</mat-error>
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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="typeId">
            @for (type of data.costTypes; track type.id) {
              <mat-option [value]="type.id">{{ type.name }}</mat-option>
            }
          </mat-select>
          @if (form.get('typeId')?.hasError('required')) {
            <mat-error>El tipo es requerido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" 
              (click)="onSave()" 
              [disabled]="!form.valid">
        {{ data.cost ? 'Guardar' : 'Crear' }}
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
export class CostDialog {
  data: CostDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CostDialog>);
  private fb = inject(FormBuilder);

  private static decimalValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value && control.value !== 0) return null;
    const normalized = String(control.value).replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num) || !/^\d+([.,]\d+)?$/.test(String(control.value).trim())) {
      return { invalidNumber: true };
    }
    if (num <= 0) return { min: true };
    return null;
  }

  form = this.fb.group({
    product: [this.data.cost?.product || '', Validators.required],
    value: [this.data.cost?.value ? String(this.data.cost.value) : '', [Validators.required, CostDialog.decimalValidator]],
    unitId: [this.data.cost?.unitId || '', Validators.required],
    typeId: [this.data.cost?.typeId || '', Validators.required]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const rawValue = String(this.form.value.value ?? '').replace(',', '.');
      const cost: Cost = {
        ...this.data.cost,
        product: this.form.value.product as string,
        value: parseFloat(rawValue),
        unitId: this.form.value.unitId as string,
        typeId: this.form.value.typeId as string
      };
      this.dialogRef.close(cost);
    }
  }
}
