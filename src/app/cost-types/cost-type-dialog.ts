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
  templateUrl: './cost-type-dialog.html',
  styleUrl: './cost-type-dialog.css'
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
