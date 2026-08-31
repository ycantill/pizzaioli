import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EXIT_REASONS, ExitReason } from '../models/stock-entry.model';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { InventoryService } from '../services/inventory.service';
import { compatibleUnits } from '../services/unit-conversion';
import { applyCount, applyExit } from '../services/weighted-average';

export type MovementKind = 'entrada' | 'salida' | 'ajuste';

export interface MovementDialogData {
  /** Se fija al abrir: el formulario no cambia de forma mientras se usa. */
  kind: MovementKind;
  supply: Supply;
  unitName: string;
  units: Unit[];
}

export interface MovementDialogResult {
  kind: MovementKind;
  reason?: ExitReason;
  quantity: number;
  unitId: string;
  totalPaid: number;
  date: string;
  note?: string;
}

@Component({
  selector: 'app-movement-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './movement-dialog.html',
  styleUrl: './movement-dialog.css'
})
export class MovementDialog {
  data: MovementDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MovementDialog>);
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);

  readonly kind = this.data.kind;
  readonly isPurchase = this.kind === 'entrada';
  readonly isExit = this.kind === 'salida';
  readonly isCount = this.kind === 'ajuste';
  readonly exitReasons = EXIT_REASONS;

  /** Fecha y nota casi nunca se tocan, así que arrancan plegadas. */
  readonly showDetails = signal(false);

  form = this.fb.nonNullable.group({
    reason: ['produccion' as ExitReason, Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0)]],
    unitId: [this.data.supply.unitId, Validators.required],
    totalPaid: [null as number | null, [Validators.required, Validators.min(0)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    note: ['']
  });

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  readonly purchaseUnits = computed(() =>
    compatibleUnits(this.data.units, this.baseUnit())
  );

  private baseUnit(): Unit | undefined {
    return this.data.units.find(u => u.id === this.data.supply.unitId);
  }

  readonly preview = computed(() => {
    const { quantity, totalPaid, unitId } = this.formValue();
    const supply = this.data.supply;
    const balance = this.inventoryService.balanceOf(supply);

    if (this.isPurchase) {
      return this.inventoryService.previewPurchase(
        supply, quantity ?? 0, totalPaid ?? 0, unitId ?? supply.unitId
      );
    }

    const next = this.isCount
      ? applyCount(balance, quantity ?? 0)
      : applyExit(balance, quantity ?? 0);

    return {
      baseQuantity: quantity ?? 0,
      entryUnitCost: supply.unitCost,
      balance: next,
      unitCostDelta: 0,
      suspiciousUnitCost: false
    };
  });

  readonly shortfall = computed(() =>
    this.isExit
      ? this.inventoryService.shortfallFor(this.data.supply, this.formValue().quantity ?? 0)
      : 0
  );

  readonly convertible = computed(() => {
    if (!this.isPurchase) return true;
    const { quantity, unitId } = this.formValue();
    return this.inventoryService.toBaseQuantity(
      this.data.supply, quantity ?? 0, unitId ?? this.data.supply.unitId
    ) !== undefined;
  });

  readonly valid = computed(() => {
    const { quantity, totalPaid } = this.formValue();
    if (quantity == null) return false;
    if (this.isCount) return quantity >= 0;
    if (this.isExit) return quantity > 0;
    return quantity > 0 && (totalPaid ?? 0) > 0 && this.convertible();
  });

  title(): string {
    if (this.isPurchase) return `Comprar ${this.data.supply.name}`;
    if (this.isExit) return `Salida de ${this.data.supply.name}`;
    return `Conteo de ${this.data.supply.name}`;
  }

  toggleDetails(): void {
    this.showDetails.update(shown => !shown);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.valid()) return;

    const value = this.form.getRawValue();
    const result: MovementDialogResult = {
      kind: this.kind,
      ...(this.isExit ? { reason: value.reason } : {}),
      quantity: value.quantity ?? 0,
      unitId: this.isPurchase ? value.unitId : this.data.supply.unitId,
      totalPaid: this.isPurchase ? (value.totalPaid ?? 0) : 0,
      date: value.date,
      ...(value.note.trim() ? { note: value.note.trim() } : {})
    };

    this.dialogRef.close(result);
  }
}
