import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CostType, CostTypeKind } from '../models/cost-type.model';
import { inferCostTypeKind } from '../services/catalog.service';

export interface CostTypeDialogData {
  costType?: CostType;
}

@Component({
  selector: 'app-cost-type-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './cost-type-dialog.html',
  styleUrl: './cost-type-dialog.css'
})
export class CostTypeDialog {
  data: CostTypeDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private dialogRef = inject(MatDialogRef<CostTypeDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.costType?.name || '', Validators.required],
    // Si el tipo viene sin clasificar, se propone lo que hoy se deduce del nombre.
    kind: [
      this.data.costType?.kind ?? inferCostTypeKind(this.data.costType?.name ?? '') ?? 'ingrediente'
    ] as [CostTypeKind]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const costType: CostType = {
        ...this.data.costType,
        ...this.form.getRawValue()
      };
      this.dialogRef.close(costType);
    }
  }
}
