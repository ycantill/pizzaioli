import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Supply } from '../models/supply.model';
import { Unit } from '../models/unit.model';
import { InventoryService } from '../services/inventory.service';
import { compatibleUnits } from '../services/unit-conversion';
import { applyCount, applyExit } from '../services/weighted-average';

export type MovementKind = 'entrada' | 'salida' | 'merma' | 'ajuste';

export interface MovementDialogData {
  supply: Supply;
  unitName: string;
  units: Unit[];
}

export interface MovementDialogResult {
  kind: MovementKind;
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
    MatButtonToggleModule,
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

  form = this.fb.nonNullable.group({
    kind: ['entrada' as MovementKind, Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    unitId: [this.data.supply.unitId, Validators.required],
    totalPaid: [0, [Validators.required, Validators.min(0)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    note: ['']
  });

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  readonly kind = computed(() => this.formValue().kind ?? 'entrada');
  readonly isPurchase = computed(() => this.kind() === 'entrada');

  /** Solo se ofrecen unidades de la misma dimensión que la del insumo. */
  readonly purchaseUnits = computed(() =>
    compatibleUnits(this.data.units, this.baseUnit())
  );

  private baseUnit(): Unit | undefined {
    return this.data.units.find(u => u.id === this.data.supply.unitId);
  }

  readonly preview = computed(() => {
    const { quantity = 0, totalPaid = 0, unitId } = this.formValue();
    const supply = this.data.supply;
    const balance = this.inventoryService.balanceOf(supply);

    if (this.isPurchase()) {
      return this.inventoryService.previewPurchase(
        supply, quantity, totalPaid, unitId ?? supply.unitId
      );
    }

    const next = this.kind() === 'ajuste'
      ? applyCount(balance, quantity)
      : applyExit(balance, quantity);

    return {
      baseQuantity: quantity,
      entryUnitCost: supply.unitCost,
      balance: next,
      unitCostDelta: 0,
      suspiciousUnitCost: false
    };
  });

  /** Se avisa, pero no se bloquea: un faltante real es información, no un error. */
  readonly shortfall = computed(() => {
    if (this.isPurchase() || this.kind() === 'ajuste') return 0;
    return this.inventoryService.shortfallFor(this.data.supply, this.formValue().quantity ?? 0);
  });

  readonly convertible = computed(() => {
    if (!this.isPurchase()) return true;
    const { quantity = 0, unitId } = this.formValue();
    return this.inventoryService.toBaseQuantity(
      this.data.supply, quantity, unitId ?? this.data.supply.unitId
    ) !== undefined;
  });

  readonly valid = computed(() => {
    const { quantity = 0, totalPaid = 0 } = this.formValue();
    if (this.kind() === 'ajuste') return quantity >= 0;
    if (!this.isPurchase()) return quantity > 0;
    return quantity > 0 && totalPaid > 0 && this.convertible();
  });

  kindHint(): string {
    switch (this.kind()) {
      case 'entrada':
        return 'Una compra recalcula el costo promedio y por lo tanto mueve los precios de venta.';
      case 'salida':
        return 'Un consumo de producción baja el stock al costo actual. Los precios no cambian.';
      case 'merma':
        return 'La merma baja el stock igual que un consumo, pero se registra aparte para poder medirla.';
      default:
        return 'Un conteo corrige la cantidad sin tocar el costo unitario. Los precios no cambian.';
    }
  }

  quantityLabel(): string {
    return this.kind() === 'ajuste' ? 'Cantidad contada' : 'Cantidad';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.valid()) return;

    const value = this.form.getRawValue();
    const result: MovementDialogResult = {
      kind: value.kind,
      quantity: value.quantity,
      unitId: this.isPurchase() ? value.unitId : this.data.supply.unitId,
      totalPaid: this.isPurchase() ? value.totalPaid : 0,
      date: value.date,
      ...(value.note.trim() ? { note: value.note.trim() } : {})
    };

    this.dialogRef.close(result);
  }
}
