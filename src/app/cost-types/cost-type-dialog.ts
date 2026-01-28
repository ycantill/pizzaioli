import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CostType } from '../models/cost-type.model';

export interface CostTypeDialogData {
  costType?: CostType;
}

@Component({
  selector: 'app-cost-type-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.costType ? 'Editar' : 'Nuevo' }} Tipo de Costo</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Ingrediente">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" 
              (click)="onSave()" 
              [disabled]="!form.valid">
        {{ data.costType ? 'Guardar' : 'Crear' }}
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
export class CostTypeDialog {
  data: CostTypeDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private dialogRef = inject(MatDialogRef<CostTypeDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.costType?.name || '', Validators.required]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const costType: CostType = {
        ...this.data.costType,
        ...this.form.value as { name: string }
      };
      this.dialogRef.close(costType);
    }
  }
}
