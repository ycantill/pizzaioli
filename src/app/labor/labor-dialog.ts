import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Consumption } from '../models/consumption.model';
import { batchSizeOf, Labor, LaborItem } from '../models/labor.model';
import { quantityPerHourOf, Rate } from '../models/rate.model';
import { RecipeType } from '../models/recipe-type.model';
import { resolveLaborItem } from '../services/labor-rates';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';
import { formatMinutes } from '../shared/format.utils';
import { getUnitAbbreviation } from '../shared/lookup.utils';
import { Unit } from '../models/unit.model';

interface ItemFormValue {
  rateId: string;
  hours: number;
  minutes: number;
  batchSize: number;
}

export interface LaborDialogData {
  labor?: Labor;
  recipeType: RecipeType;
  rates: Rate[];
  units: Unit[];
  /** Solo para leer configuraciones viejas. Ver `resolveLaborItem`. */
  legacyConsumptions: Consumption[];
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

  /**
   * Líneas heredadas cuyo ritmo no coincide con el de su tarifa.
   *
   * El ritmo vivía en el consumo ("Horno: 2,5 m³/h") y ahora vive en la tarifa,
   * que hasta que alguien la edite dice 1. Mientras no se toque nada el precio
   * sigue saliendo bien —la línea vieja se lee tal cual—, pero guardar aquí la
   * pasa a la forma nueva y el costo cambiaría sin avisar. Esto avisa.
   */
  readonly legacyMismatches = (this.data.labor?.items ?? [])
    .filter(item => !item.rateId && item.consumptionId)
    .map(item => {
      const resolved = resolveLaborItem(item, this.data.rates, this.data.legacyConsumptions);
      if (!resolved) return null;

      const rate = this.data.rates.find(r => r.id === resolved.rateId);
      const current = quantityPerHourOf(rate);
      if (!rate || current === resolved.quantityPerHour) return null;

      return {
        name: resolved.name,
        rateName: rate.name,
        was: resolved.quantityPerHour,
        now: current,
        unit: getUnitAbbreviation(this.data.units, rate.unitId)
      };
    })
    .filter(mismatch => mismatch !== null);

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
    // Una configuración vieja apunta a un consumo; se traduce a su tarifa.
    const resolved = item
      ? resolveLaborItem(item, this.data.rates, this.data.legacyConsumptions)
      : undefined;

    return this.fb.group({
      rateId: [resolved?.rateId ?? this.data.rates[0]?.id ?? '', Validators.required],
      hours: [hours, [Validators.required, Validators.min(0)]],
      minutes: [minutes, [Validators.required, Validators.min(0), Validators.max(59)]],
      batchSize: [item ? batchSizeOf(item) : 1, [Validators.required, Validators.min(1)]]
    });
  }

  /** Cómo se gasta esa tarifa, para no tener que recordarlo al elegirla. */
  rateLabel(rate: Rate): string {
    const quantity = quantityPerHourOf(rate);
    const abbreviation = getUnitAbbreviation(this.data.units, rate.unitId);
    return quantity === 1 ? rate.name : `${rate.name} (${quantity} ${abbreviation}/h)`;
  }

  availableRates(currentIndex: number): Rate[] {
    const currentId = this.itemsArray.at(currentIndex).get('rateId')?.value;
    const usedIds = this.itemsArray.controls
      .map((ctrl, idx) => idx !== currentIndex ? ctrl.get('rateId')?.value : null)
      .filter(id => id !== null);

    return this.data.rates.filter(rate => rate.id === currentId || !usedIds.includes(rate.id));
  }

  addItem() {
    const usedIds = this.itemsArray.controls.map(ctrl => ctrl.get('rateId')?.value);
    const available = this.data.rates.find(rate => !usedIds.includes(rate.id));

    if (available) {
      this.itemsArray.push(this.createItemGroup({
        rateId: available.id!,
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
    if (!this.form.valid) return;

    const items: LaborItem[] = (this.formValue().items as ItemFormValue[])
      .map(item => ({
        rateId: item.rateId,
        minutes: (item.hours * 60) + item.minutes,
        batchSize: item.batchSize > 0 ? item.batchSize : 1
      }))
      .filter(item => item.minutes > 0);

    if (items.length === 0) return;

    this.dialogRef.close({ recipeTypeId: this.data.recipeType.id!, items });
  }
}
