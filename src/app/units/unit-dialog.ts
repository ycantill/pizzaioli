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
  templateUrl: './unit-dialog.html',
  styleUrl: './unit-dialog.css'
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
