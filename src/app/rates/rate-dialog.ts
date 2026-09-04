import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DELETE_REQUESTED, DeleteRequested } from '../shared/dialog.service';
import { MarginConfig } from '../models/margin-config.model';
import { quantityPerHourOf, Rate } from '../models/rate.model';
import { Unit } from '../models/unit.model';
import { marginPercent } from '../services/pricing';
import { getUnitAbbreviation } from '../shared/lookup.utils';
import { marginFromForm, MarginFields, marginGroup } from '../shared/margin-fields';

export interface RateDialogData {
  rate?: Rate;
  units: Unit[];
}

export interface RateDialogResult {
  name: string;
  unitId: string;
  value: number;
  quantityPerHour: number;
  margin: MarginConfig;
}

@Component({
  selector: 'app-rate-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MarginFields
  ],
  templateUrl: './rate-dialog.html',
  styleUrl: './rate-dialog.css'
})
export class RateDialog {
  data: RateDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RateDialog, RateDialogResult | DeleteRequested>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.rate?.name ?? '', Validators.required],
    unitId: [this.data.rate?.unitId ?? '', Validators.required],
    value: [this.data.rate?.value ?? 0, [Validators.required, Validators.min(0)]],
    quantityPerHour: [
      quantityPerHourOf(this.data.rate),
      [Validators.required, Validators.min(0)]
    ],
    margin: marginGroup(this.fb, this.data.rate?.margin)
  });

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  get marginGroup() {
    return this.form.controls.margin;
  }

  readonly marginTotal = computed(() => marginPercent(marginFromForm(this.formValue().margin)));

  /** La abreviatura de la unidad elegida, para leer "2 m³/h" mientras se escribe. */
  readonly unitAbbreviation = computed(() =>
    getUnitAbbreviation(this.data.units, this.formValue().unitId ?? '')
  );

  /**
   * Un error solo se muestra si el usuario ya pasó por el campo: con controles
   * nativos hay que reponer lo que hacía mat-form-field, o el formulario
   * aparece en rojo antes de que nadie haya escrito nada.
   */
  showError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!control && control.touched && control.hasError(error);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Eliminar vive dentro de la edición y no en la lista: ahí ya está claro
   * sobre qué tarifa se actúa, y la lista queda sin controles que apuntar.
   */
  onDelete(): void {
    this.dialogRef.close(DELETE_REQUESTED);
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { name, unitId, value, quantityPerHour, margin } = this.form.getRawValue();
    const result: RateDialogResult = {
      name: name.trim(),
      unitId,
      value,
      quantityPerHour: Number(quantityPerHour) || 1,
      margin: marginFromForm(margin)
    };
    this.dialogRef.close(result);
  }
}
