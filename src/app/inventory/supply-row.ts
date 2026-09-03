import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EXIT_REASONS, ExitReason, StockEntry } from '../models/stock-entry.model';
import { Supply } from '../models/supply.model';
import { InventoryService } from '../services/inventory.service';
import { MovementKind } from './movement-dialog';

/**
 * Lo que la fila pide hacer; la pantalla decide cómo.
 *
 * Solo hay una operación de stock: la compra. Salida y conteo se quitaron de
 * la interfaz porque nunca se usaron —26 insumos, 26 movimientos, todos de
 * apertura— y el descuento por pedidos, cuando exista, llamará al servicio
 * directamente en vez de pasar por aquí.
 *
 * 'entrada' viene de MovementKind y se guarda tal cual en Firestore: va en
 * español porque es del dominio y renombrarlo rompería los datos.
 */
export type SupplyAction = Extract<MovementKind, 'entrada'> | 'edit' | 'delete';

function exitReasonLabel(reason: ExitReason | undefined): string {
  return EXIT_REASONS.find(r => r.value === reason)?.label ?? 'Salida';
}

@Component({
  selector: 'app-supply-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatButtonModule, MatIconModule],
  templateUrl: './supply-row.html',
  styleUrl: './supply-row.css',
  host: { class: 'supply-row', '[class.is-low]': 'lowStock()' }
})
export class SupplyRow {
  private inventoryService = inject(InventoryService);

  readonly supply = input.required<Supply>();
  readonly unitAbbr = input.required<string>();
  readonly expanded = input(false);
  readonly lowStock = input(false);
  readonly saving = input(false);

  readonly toggled = output<void>();
  readonly action = output<SupplyAction>();

  /**
   * Costos en pesos por unidad base: $3,20 el gramo de harina, $1.700 la caja.
   * Dos decimales fijos alinean la columna sin arrastrar ceros inútiles.
   */
  readonly unitCostFormat = '1.2-2';

  /** Solo se leen al desplegar: son 26 filas y casi ninguna se abre. */
  readonly movements = computed<StockEntry[]>(() => {
    const id = this.supply().id;
    return this.expanded() && id ? this.inventoryService.entriesFor(id) : [];
  });

  /** En las salidas manda el motivo, que es lo que distingue una de otra. */
  movementLabel(entry: StockEntry): string {
    switch (entry.kind) {
      case 'apertura': return 'Apertura';
      case 'ajuste': return 'Conteo';
      case 'salida': return exitReasonLabel(entry.reason);
      default: return 'Compra';
    }
  }
}
