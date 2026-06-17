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
  templateUrl: './margin-dialog.html',
  styleUrl: './margin-dialog.css'
})
export class MarginDialog {
  data: MarginDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MarginDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    costId: [this.data.margin?.costId ?? '', Validators.required],
    recoveryPercentage: [this.data.margin?.recoveryPercentage ?? 100, [Validators.required, Validators.min(0)]],
    reinvestmentPercentage: [this.data.margin?.reinvestmentPercentage ?? 100, [Validators.required, Validators.min(0)]],
    profitPercentage: [this.data.margin?.profitPercentage ?? 100, [Validators.required, Validators.min(0)]]
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
