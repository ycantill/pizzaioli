import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';
import { Unit } from '../models/unit.model';

export interface ConsumptionDialogData {
  consumption?: Consumption;
  costs: Cost[];
  units: Unit[];
}

@Component({
  selector: 'app-consumption-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './consumption-dialog.html',
  styleUrl: './consumption-dialog.css'
})
export class ConsumptionDialog {
  data: ConsumptionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConsumptionDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [this.data.consumption?.name || '', Validators.required],
    costId: [this.data.consumption?.costId || '', Validators.required],
    quantity: [this.data.consumption?.quantity || 1, [Validators.required, Validators.min(0.1)]]
  });

  getCost(costId: string): Cost | undefined {
    return this.data.costs.find(c => c.id === costId);
  }

  getUnitLabel(): string {
    const costId = this.form.get('costId')?.value;
    if (!costId) return '';
    
    const cost = this.getCost(costId);
    if (!cost) return '';
    
    const unit = this.data.units.find(u => u.id === cost.unitId);
    return unit ? ` (${unit.name})` : '';
  }

  onCostChange(): void {
    // Trigger change detection to update unit label
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
