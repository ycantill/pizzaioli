import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CostType } from '../models/cost-type.model';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';

export interface SupplyDialogData {
  supply?: Supply;
  units: Unit[];
  categories: CostType[];
}

export interface SupplyDialogResult {
  name: string;
  unitId: string;
  categoryId: string;
  minStock?: number;
}

@Component({
  selector: 'app-supply-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './supply-dialog.html',
  styleUrl: './supply-dialog.css'
})
export class SupplyDialog {
  data: SupplyDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SupplyDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.supply?.name ?? '', Validators.required],
    unitId: [this.data.supply?.unitId ?? '', Validators.required],
    categoryId: [this.data.supply?.categoryId ?? '', Validators.required],
    minStock: [this.data.supply?.minStock ?? null as number | null]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { name, unitId, categoryId, minStock } = this.form.getRawValue();
    const result: SupplyDialogResult = {
      name: name.trim(),
      unitId,
      categoryId,
      // El stock mínimo es opcional: Firestore no acepta undefined.
      ...(minStock !== null && minStock >= 0 ? { minStock } : {})
    };

    this.dialogRef.close(result);
  }
}
