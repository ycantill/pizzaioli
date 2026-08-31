/**
 * Movimiento de inventario. Colección append-only: cada documento es un
 * hecho histórico y su `unitCost` se congela al guardarse, nunca se
 * recalcula. El saldo vigente vive denormalizado en el Supply.
 */
export type StockEntryKind = 'apertura' | 'entrada' | 'salida' | 'merma' | 'ajuste';

export interface StockEntry {
  id?: string;
  supplyId: string;
  date: string;
  kind: StockEntryKind;
  quantity: number;
  unitId: string;
  totalPaid: number;
  unitCost: number;
  note?: string;
}
