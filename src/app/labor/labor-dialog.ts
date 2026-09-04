import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';
import { batchSizeOf, Labor, LaborItem } from '../models/labor.model';
import { getItemName } from '../shared/lookup.utils';
import { RecipeType } from '../models/recipe-type.model';
import { Consumption } from '../models/consumption.model';
import { PricedItem } from '../models/priced-item.model';
import { formatMinutes } from '../shared/format.utils';

interface ItemFormValue {
  consumptionId: string;
  hours: number;
  minutes: number;
  batchSize: number;
}

export interface LaborDialogData {
  labor?: Labor;
  recipeType: RecipeType;
  consumptions: Consumption[];
  costs: PricedItem[];
}

@Component({
  selector: 'app-labor-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './labor-dialog.html',
  styleUrl: './labor-dialog.css'
})
export class LaborDialog {
  data: LaborDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<LaborDialog, Labor | DeleteRequested>);
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

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  /**
   * Lo que le toca a una unidad, en vivo mientras se escribe. Es el número que
   * de verdad entra al precio: los minutos de arriba son los de la tanda.
   */
  readonly perUnitLabels = computed(() =>
    (this.formValue().items as ItemFormValue[]).map(item => {
      const total = (item.hours || 0) * 60 + (item.minutes || 0);
      const batch = item.batchSize > 0 ? item.batchSize : 1;
      return formatMinutes(total / batch);
    })
  );

  createItemGroup(item?: LaborItem) {
    const hours = item ? Math.floor(item.minutes / 60) : 0;
    const minutes = item ? item.minutes % 60 : 0;

    return this.fb.group({
      consumptionId: [item?.consumptionId || this.data.consumptions[0]?.id || '', Validators.required],
      hours: [hours, [Validators.required, Validators.min(0)]],
      minutes: [minutes, [Validators.required, Validators.min(0), Validators.max(59)]],
      batchSize: [item ? batchSizeOf(item) : 1, [Validators.required, Validators.min(1)]]
    });
  }

  getCostName(supplyId: string): string {
    return getItemName(this.data.costs, supplyId);
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
        minutes: 0,
        batchSize: 1
      }));
    }
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const items: LaborItem[] = (this.formValue().items as ItemFormValue[])
        .map(item => ({
          consumptionId: item.consumptionId,
          minutes: (item.hours * 60) + item.minutes,
          batchSize: item.batchSize > 0 ? item.batchSize : 1
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
