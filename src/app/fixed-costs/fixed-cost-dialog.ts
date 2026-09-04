import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FixedCost } from '../models/fixed-cost.model';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';

export interface FixedCostDialogData {
  fixedCost?: FixedCost;
}

export type FixedCostDialogResult = Omit<FixedCost, 'id'>;

@Component({
  selector: 'app-fixed-cost-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './fixed-cost-dialog.html',
  styleUrl: './fixed-cost-dialog.css'
})
export class FixedCostDialog {
  data: FixedCostDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FixedCostDialog, FixedCostDialogResult | DeleteRequested>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.fixedCost?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    monthlyAmount: [
      this.data.fixedCost?.monthlyAmount ?? 0,
      [Validators.required, Validators.min(0)]
    ]
  });

  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { name, monthlyAmount } = this.form.getRawValue();
    this.dialogRef.close({ name: name.trim(), monthlyAmount: Number(monthlyAmount) || 0 });
  }
}
