import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Consumption } from '../models/consumption.model';
import { PricedItem } from '../models/priced-item.model';
import { Unit } from '../models/unit.model';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';

export interface ConsumptionDialogData {
  consumption?: Consumption;
  costs: PricedItem[];
  units: Unit[];
}

@Component({
  selector: 'app-consumption-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './consumption-dialog.html',
  styleUrl: './consumption-dialog.css'
})
export class ConsumptionDialog {
  data: ConsumptionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConsumptionDialog, Consumption | DeleteRequested>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.consumption?.name || '', Validators.required],
    rateId: [this.data.consumption?.rateId || '', Validators.required],
    quantity: [this.data.consumption?.quantity || 1, [Validators.required, Validators.min(0.1)]]
  });

  getCost(rateId: string): PricedItem | undefined {
    return this.data.costs.find(c => c.id === rateId);
  }

  getUnitLabel(): string {
    const rateId = this.form.get('rateId')?.value;
    if (!rateId) return '';
    
    const cost = this.getCost(rateId);
    if (!cost) return '';
    
    const unit = this.data.units.find(u => u.id === cost.unitId);
    return unit ? ` (${unit.name})` : '';
  }

  onCostChange(): void {
    // Trigger change detection to update unit label
  }

  /**
   * Un error solo se muestra si el usuario ya pasó por el campo: con controles
   * nativos hay que reponer lo que hacía mat-form-field.
   */
  showError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!control && control.touched && control.hasError(error);
  }

  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const consumption: Consumption = this.form.value as Consumption;
      this.dialogRef.close(consumption);
    }
  }
}
