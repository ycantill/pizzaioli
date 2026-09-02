import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Rate } from '../models/rate.model';
import { Unit } from '../models/unit.model';

export interface RateDialogData {
  rate?: Rate;
  units: Unit[];
}

export interface RateDialogResult {
  name: string;
  unitId: string;
  value: number;
}

@Component({
  selector: 'app-rate-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './rate-dialog.html',
  styleUrl: './rate-dialog.css'
})
export class RateDialog {
  data: RateDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RateDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.rate?.name ?? '', Validators.required],
    unitId: [this.data.rate?.unitId ?? '', Validators.required],
    value: [this.data.rate?.value ?? 0, [Validators.required, Validators.min(0)]]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { name, unitId, value } = this.form.getRawValue();
    const result: RateDialogResult = { name: name.trim(), unitId, value };
    this.dialogRef.close(result);
  }
}
