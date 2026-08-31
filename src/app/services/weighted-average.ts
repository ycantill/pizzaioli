import { StockEntry } from '../models/stock-entry.model';

/** Saldo vigente de un insumo. Es lo que vive denormalizado en el Supply. */
export interface StockBalance {
  stock: number;
  stockValue: number;
  unitCost: number;
}

export const EMPTY_BALANCE: StockBalance = { stock: 0, stockValue: 0, unitCost: 0 };

/**
 * Aplica una compra al saldo (promedio ponderado).
 *
 * Las entradas son lo único que mueve el PPP: el costo unitario pasa a ser el
 * valor total del inventario dividido por la cantidad total.
 */
export function applyEntry(
  balance: StockBalance,
  quantity: number,
  totalPaid: number
): StockBalance {
  const stock = balance.stock + quantity;
  const stockValue = balance.stockValue + totalPaid;

  return {
    stock,
    stockValue,
    // Con stock 0 el promedio se indefine; se conserva el último PPP conocido.
    unitCost: stock > 0 ? stockValue / stock : balance.unitCost
  };
}

/**
 * Aplica una salida: consumo de producción o merma.
 *
 * No mueve el PPP —el costo de lo que queda es el mismo que antes— y por eso
 * los precios de venta no cambian al producir. El valor se recalcula como
 * stock x unitCost en vez de restar, para que el invariante se mantenga
 * exacto y no se acumule error de coma flotante.
 */
export function applyExit(balance: StockBalance, quantity: number): StockBalance {
  // No se puede sacar más de lo que hay: el faltante se reporta aparte.
  const stock = balance.stock - Math.min(quantity, balance.stock);

  return {
    stock,
    stockValue: stock * balance.unitCost,
    unitCost: balance.unitCost
  };
}

/** Cuánto de una salida no alcanza a cubrirse con el stock disponible. */
export function shortfall(balance: StockBalance, quantity: number): number {
  return Math.max(0, quantity - balance.stock);
}

/**
 * Aplica un conteo físico. Corrige la cantidad sin tocar el costo unitario:
 * contar lo que hay no cambia lo que se pagó por ello.
 */
export function applyCount(balance: StockBalance, countedQuantity: number): StockBalance {
  return {
    stock: countedQuantity,
    stockValue: countedQuantity * balance.unitCost,
    unitCost: balance.unitCost
  };
}

/**
 * Reconstruye el saldo desde el historial completo. No se usa en la carga
 * normal —para eso está el saldo denormalizado— sino para auditar que el
 * saldo guardado siga cuadrando con sus movimientos.
 */
export function replayEntries(entries: StockEntry[]): StockBalance {
  const ordered = [...entries].sort(compareEntries);

  return ordered.reduce((balance, entry) => {
    if (entry.kind === 'ajuste') return applyCount(balance, entry.quantity);
    if (entry.kind === 'salida' || entry.kind === 'merma') {
      return applyExit(balance, entry.quantity);
    }
    return applyEntry(balance, entry.quantity, entry.totalPaid);
  }, EMPTY_BALANCE);
}

/** La apertura siempre va primero; el resto por fecha y luego por id, para ser estable. */
function compareEntries(a: StockEntry, b: StockEntry): number {
  if (a.kind === 'apertura' && b.kind !== 'apertura') return -1;
  if (b.kind === 'apertura' && a.kind !== 'apertura') return 1;

  const byDate = a.date.localeCompare(b.date);
  return byDate !== 0 ? byDate : (a.id ?? '').localeCompare(b.id ?? '');
}

/**
 * Reexpresa un saldo en otra unidad: la cantidad se multiplica y el costo
 * unitario se divide por el mismo factor, de modo que el valor del inventario
 * no cambia. Es una conversión, no una corrección de etiqueta.
 */
export function rescaleBalance(balance: StockBalance, factor: number): StockBalance {
  if (factor <= 0) return balance;

  return {
    stock: balance.stock * factor,
    stockValue: balance.stockValue,
    unitCost: balance.unitCost / factor
  };
}

/** Costo unitario de una compra concreta, congelado en la entrada. */
export function entryUnitCost(quantity: number, totalPaid: number): number {
  return quantity > 0 ? totalPaid / quantity : 0;
}
