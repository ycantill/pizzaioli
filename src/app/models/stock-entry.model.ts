/**
 * Movimiento de inventario. Colección append-only: cada documento es un
 * hecho histórico y su `unitCost` se congela al guardarse, nunca se
 * recalcula. El saldo vigente vive denormalizado en el Supply.
 */

/**
 * Qué le hace el movimiento al saldo. Es lo único que el motor de cálculo
 * necesita saber, y por eso son cuatro y no más: sumar, restar, o fijar.
 */
export type StockEntryKind = 'apertura' | 'entrada' | 'salida' | 'ajuste';

/**
 * Por qué salió. No afecta el saldo —una merma y un consumo restan igual—,
 * pero permite medir cada motivo por separado. Agregar uno nuevo no toca el
 * motor de saldos.
 */
export type ExitReason = 'produccion' | 'merma' | 'otro';

export const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: 'produccion', label: 'Consumo de producción' },
  { value: 'merma', label: 'Merma' },
  { value: 'otro', label: 'Otro' }
];

export interface StockEntry {
  id?: string;
  supplyId: string;
  date: string;
  kind: StockEntryKind;
  /** Solo en las salidas. */
  reason?: ExitReason;
  quantity: number;
  unitId: string;
  totalPaid: number;
  unitCost: number;
  note?: string;
}
