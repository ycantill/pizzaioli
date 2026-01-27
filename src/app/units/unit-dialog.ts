import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Unit } from '../models/unit.model';

export interface UnitDialogData {
  unit?: Unit;
}

@Component({
  selector: 'app-unit-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.unit ? 'Editar' : 'Nueva' }} Unidad</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" placeholder="Ej: KILOGRAMO">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Abreviación</mat-label>
          <input matInput formControlName="abbreviation" placeholder="Ej: KG">
          @if (form.get('abbreviation')?.hasError('required')) {
            <mat-error>La abreviación es requerida</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" 
              (click)="onSave()" 
              [disabled]="!form.valid">
        {{ data.unit ? 'Guardar' : 'Crear' }}
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
export class UnitDialog {
  data: UnitDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<UnitDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.unit?.name || '', Validators.required],
    abbreviation: [this.data.unit?.abbreviation || '', Validators.required]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const unit: Unit = {
        ...this.data.unit,
        ...this.form.value as { name: string; abbreviation: string }
      };
      this.dialogRef.close(unit);
    }
  }
}
