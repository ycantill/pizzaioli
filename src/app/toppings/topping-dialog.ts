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
  templateUrl: './topping-dialog.html',
  styleUrl: './topping-dialog.css'
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
