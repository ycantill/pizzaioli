import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topping, ToppingSize, TOPPING_SIZES } from '../models/topping.model';
import { Cost } from '../models/cost.model';

export interface ToppingDialogData {
  topping?: Topping;
  costs: Cost[];
}

@Component({
  selector: 'app-topping-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.topping ? 'Editar' : 'Nuevo' }} Topping</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ingrediente</mat-label>
          <mat-select formControlName="costId">
            @for (cost of data.costs; track cost.id) {
              <mat-option [value]="cost.id">{{ cost.product }}</mat-option>
            }
          </mat-select>
          @if (form.get('costId')?.hasError('required')) {
            <mat-error>El ingrediente es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" formControlName="quantity" placeholder="0">
          @if (form.get('quantity')?.hasError('required')) {
            <mat-error>La cantidad es requerida</mat-error>
          }
          @if (form.get('quantity')?.hasError('min')) {
            <mat-error>La cantidad debe ser mayor a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tamaño</mat-label>
          <mat-select formControlName="size">
            @for (size of sizes; track size) {
              <mat-option [value]="size">{{ size }}</mat-option>
            }
          </mat-select>
          @if (form.get('size')?.hasError('required')) {
            <mat-error>El tamaño es requerido</mat-error>
          }
        </mat-form-field>

        <mat-checkbox formControlName="salsaBase">Salsa base</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary"
              (click)="onSave()"
              [disabled]="!form.valid">
        {{ data.topping ? 'Guardar' : 'Crear' }}
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
export class ToppingDialog {
  data: ToppingDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ToppingDialog>);
  private fb = inject(FormBuilder);

  readonly sizes = TOPPING_SIZES;

  form = this.fb.group({
    costId: [this.data.topping?.costId ?? '', Validators.required],
    quantity: [this.data.topping?.quantity ?? null, [Validators.required, Validators.min(0.01)]],
    size: [this.data.topping?.size ?? 'M' as ToppingSize, Validators.required],
    salsaBase: [this.data.topping?.salsaBase ?? false]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const topping: Topping = {
        ...this.data.topping,
        ...this.form.value as { costId: string; quantity: number; size: ToppingSize; salsaBase: boolean }
      };
      this.dialogRef.close(topping);
    }
  }
}
