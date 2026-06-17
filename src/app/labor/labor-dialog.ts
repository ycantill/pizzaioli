import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Labor, LaborItem } from '../models/labor.model';
import { RecipeType } from '../models/recipe-type.model';
import { Consumption } from '../models/consumption.model';
import { Cost } from '../models/cost.model';

export interface LaborDialogData {
  labor?: Labor;
  recipeType: RecipeType;
  consumptions: Consumption[];
  costs: Cost[];
}

@Component({
  selector: 'app-labor-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './labor-dialog.html',
  styleUrl: './labor-dialog.css'
})
export class LaborDialog {
  data: LaborDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<LaborDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    items: this.fb.array(
      this.data.labor?.items?.length
        ? this.data.labor.items.map(item => this.createItemGroup(item))
        : [this.createItemGroup()]
    )
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: LaborItem) {
    const hours = item ? Math.floor(item.minutes / 60) : 0;
    const minutes = item ? item.minutes % 60 : 0;

    return this.fb.group({
      consumptionId: [item?.consumptionId || this.data.consumptions[0]?.id || '', Validators.required],
      hours: [hours, [Validators.required, Validators.min(0)]],
      minutes: [minutes, [Validators.required, Validators.min(0), Validators.max(59)]]
    });
  }

  getCostName(costId: string): string {
    const cost = this.data.costs.find(c => c.id === costId);
    return cost ? cost.product : 'Desconocido';
  }

  availableConsumptions(currentIndex: number): Consumption[] {
    const currentId = this.itemsArray.at(currentIndex).get('consumptionId')?.value;
    const usedIds = this.itemsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('consumptionId')?.value : null)
      .filter(id => id !== null);

    return this.data.consumptions.filter(c =>
      c.id === currentId || !usedIds.includes(c.id)
    );
  }

  addItem() {
    const usedIds = this.itemsArray.controls.map(ctrl => ctrl.get('consumptionId')?.value);
    const available = this.data.consumptions.find(c => !usedIds.includes(c.id));

    if (available) {
      this.itemsArray.push(this.createItemGroup({
        consumptionId: available.id!,
        minutes: 0
      }));
    }
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const items: LaborItem[] = (formValue.items as Array<{ consumptionId: string; hours: number; minutes: number }>)
        .map(item => ({
          consumptionId: item.consumptionId,
          minutes: (item.hours * 60) + item.minutes
        }))
        .filter(item => item.minutes > 0);

      if (items.length === 0) return;

      const labor: Labor = {
        recipeTypeId: this.data.recipeType.id!,
        items
      };
      this.dialogRef.close(labor);
    }
  }
}
