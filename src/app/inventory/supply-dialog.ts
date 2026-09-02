import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupplyCategory } from '../models/supply-category.model';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { convert } from '../services/unit-conversion';
import { rescaleBalance, StockBalance } from '../services/weighted-average';

export interface SupplyDialogData {
  supply?: Supply;
  units: Unit[];
  categories: SupplyCategory[];
}

export interface SupplyDialogResult {
  name: string;
  unitId: string;
  categoryId: string;
  minStock?: number;
  /** Presente solo si se pidió convertir el saldo a la unidad nueva. */
  balance?: StockBalance;
}

@Component({
  selector: 'app-supply-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './supply-dialog.html',
  styleUrl: './supply-dialog.css'
})
export class SupplyDialog {
  data: SupplyDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SupplyDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: [this.data.supply?.name ?? '', Validators.required],
    unitId: [this.data.supply?.unitId ?? '', Validators.required],
    categoryId: [this.data.supply?.categoryId ?? '', Validators.required],
    minStock: [this.data.supply?.minStock ?? null as number | null],
    // Por defecto se corrige la etiqueta, que es el caso frecuente.
    convertBalance: [false]
  });

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  readonly unitChanged = computed(() =>
    !!this.data.supply && this.formValue().unitId !== this.data.supply.unitId
  );

  /** Cuántas unidades nuevas equivale una de las viejas. */
  private readonly factor = computed(() => {
    const supply = this.data.supply;
    if (!supply) return undefined;

    return convert(1, this.unitById(supply.unitId), this.unitById(this.formValue().unitId));
  });

  readonly convertible = computed(() => this.factor() !== undefined);

  readonly converting = computed(() =>
    this.unitChanged() && this.convertible() && !!this.formValue().convertBalance
  );

  readonly rescaled = computed(() => {
    const supply = this.data.supply;
    const factor = this.factor();
    if (!supply || factor === undefined) return undefined;

    return rescaleBalance(
      { stock: supply.stock, stockValue: supply.stockValue, unitCost: supply.unitCost },
      factor
    );
  });

  private unitById(unitId: string | undefined): Unit | undefined {
    return this.data.units.find(u => u.id === unitId);
  }

  unitName(unitId: string | undefined): string {
    return this.unitById(unitId)?.name ?? '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    const { name, unitId, categoryId, minStock } = this.form.getRawValue();
    const result: SupplyDialogResult = {
      name: name.trim(),
      unitId,
      categoryId,
      // El stock mínimo es opcional: Firestore no acepta undefined.
      ...(minStock !== null && minStock >= 0 ? { minStock } : {}),
      ...(this.converting() && this.rescaled() ? { balance: this.rescaled()! } : {})
    };

    this.dialogRef.close(result);
  }
}
