import { Component, inject } from '@angular/core';
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
  templateUrl: './cost-dialog.html',
  styleUrl: './cost-dialog.css'
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
