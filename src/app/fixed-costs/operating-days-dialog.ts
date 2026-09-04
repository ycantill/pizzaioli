import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface OperatingDaysDialogData {
  operatingDaysPerMonth: number;
}

@Component({
  selector: 'app-operating-days-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './operating-days-dialog.html',
  styleUrl: './operating-days-dialog.css'
})
export class OperatingDaysDialog {
  data: OperatingDaysDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<OperatingDaysDialog, number>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    operatingDaysPerMonth: [
      this.data.operatingDaysPerMonth,
      [Validators.required, Validators.min(1), Validators.max(31)]
    ]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;
    this.dialogRef.close(Number(this.form.getRawValue().operatingDaysPerMonth) || 30);
  }
}
