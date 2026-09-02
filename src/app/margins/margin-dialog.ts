import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MarginConfig } from '../models/margin-config.model';
import { PricedItem } from '../models/priced-item.model';

export interface MarginDialogData {
  item: PricedItem;
}

@Component({
  selector: 'app-margin-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  templateUrl: './margin-dialog.html',
  styleUrl: './margin-dialog.css'
})
export class MarginDialog {
  data: MarginDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MarginDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    recoveryPercentage: [this.data.item.margin.recoveryPercentage, [Validators.required, Validators.min(0)]],
    reinvestmentPercentage: [this.data.item.margin.reinvestmentPercentage, [Validators.required, Validators.min(0)]],
    profitPercentage: [this.data.item.margin.profitPercentage, [Validators.required, Validators.min(0)]]
  });

  getTotalMargin(): number {
    const { recoveryPercentage, reinvestmentPercentage, profitPercentage } = this.form.getRawValue();
    return (recoveryPercentage || 0) + (reinvestmentPercentage || 0) + (profitPercentage || 0);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const margin: MarginConfig = this.form.getRawValue();
    this.dialogRef.close(margin);
  }
}
