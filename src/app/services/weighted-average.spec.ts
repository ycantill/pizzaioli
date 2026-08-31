import { describe, expect, it } from 'vitest';
import { StockEntry } from '../models/stock-entry.model';
import {
  applyCount,
  applyEntry,
  applyExit,
  EMPTY_BALANCE,
  entryUnitCost,
  replayEntries,
  shortfall
} from './weighted-average';

function entry(overrides: Partial<StockEntry> = {}): StockEntry {
  const quantity = overrides.quantity ?? 25;
  const totalPaid = overrides.totalPaid ?? 150000;
  return {
    id: 'e1',
    supplyId: 'harina',
    date: '2026-01-01',
    kind: 'entrada',
    unitId: 'kg',
    quantity,
    totalPaid,
    unitCost: entryUnitCost(quantity, totalPaid),
    ...overrides
  };
}

describe('applyEntry', () => {
  it('la primera compra fija el costo unitario', () => {
    expect(applyEntry(EMPTY_BALANCE, 25, 150000)).toEqual({
      stock: 25, stockValue: 150000, unitCost: 6000
    });
  });

  it('promedia dos compras a precios distintos', () => {
    const first = applyEntry(EMPTY_BALANCE, 25, 150000);
    const second = applyEntry(first, 25, 180000);

    expect(second).toEqual({ stock: 50, stockValue: 330000, unitCost: 6600 });
  });

  it('conserva el último PPP si el saldo queda en cero', () => {
    const balance = { stock: 0, stockValue: 0, unitCost: 6600 };

    expect(applyEntry(balance, 0, 0).unitCost).toBe(6600);
  });
});

describe('applyCount', () => {
  it('corrige la cantidad sin mover el costo unitario', () => {
    const balance = { stock: 50, stockValue: 330000, unitCost: 6600 };

    expect(applyCount(balance, 40)).toEqual({
      stock: 40, stockValue: 264000, unitCost: 6600
    });
  });

  it('deja el valor en cero al agotarse, pero recuerda el costo', () => {
    const balance = { stock: 50, stockValue: 330000, unitCost: 6600 };
    const emptied = applyCount(balance, 0);

    expect(emptied.stockValue).toBe(0);
    expect(emptied.unitCost).toBe(6600);
  });

  it('un conteo no cambia el precio de venta, una compra sí', () => {
    const balance = applyEntry(EMPTY_BALANCE, 25, 150000);

    expect(applyCount(balance, 10).unitCost).toBe(balance.unitCost);
    expect(applyEntry(balance, 25, 180000).unitCost).not.toBe(balance.unitCost);
  });
});

describe('replayEntries', () => {
  it('reproduce el ejemplo completo de compras y conteo', () => {
    const balance = replayEntries([
      entry({ id: 'a', date: '2026-01-01', quantity: 25, totalPaid: 150000 }),
      entry({ id: 'b', date: '2026-02-01', quantity: 25, totalPaid: 180000 }),
      entry({ id: 'c', date: '2026-02-15', kind: 'ajuste', quantity: 40, totalPaid: 0 }),
      entry({ id: 'd', date: '2026-03-01', quantity: 10, totalPaid: 80000 })
    ]);

    expect(balance.stock).toBe(50);
    expect(balance.stockValue).toBe(344000);
    expect(balance.unitCost).toBe(6880);
  });

  it('procesa la apertura primero aunque venga con fecha posterior', () => {
    const balance = replayEntries([
      entry({ id: 'b', date: '2026-01-01', quantity: 25, totalPaid: 180000 }),
      entry({ id: 'a', date: '2026-06-01', kind: 'apertura', quantity: 1, totalPaid: 6000 })
    ]);

    expect(balance.stock).toBe(26);
    expect(balance.stockValue).toBe(186000);
  });

  it('es estable ante el orden de llegada de los documentos', () => {
    const entries = [
      entry({ id: 'a', date: '2026-01-01', quantity: 25, totalPaid: 150000 }),
      entry({ id: 'b', date: '2026-02-01', quantity: 25, totalPaid: 180000 })
    ];

    expect(replayEntries(entries)).toEqual(replayEntries([...entries].reverse()));
  });

  it('un historial vacío da saldo vacío', () => {
    expect(replayEntries([])).toEqual(EMPTY_BALANCE);
  });
});

describe('entryUnitCost', () => {
  it('congela el costo de la compra', () => {
    expect(entryUnitCost(25, 150000)).toBe(6000);
  });

  it('no divide por cero', () => {
    expect(entryUnitCost(0, 150000)).toBe(0);
  });
});

describe('applyExit', () => {
  it('baja el stock y su valor sin mover el costo unitario', () => {
    const balance = { stock: 50, stockValue: 330000, unitCost: 6600 };

    expect(applyExit(balance, 10)).toEqual({
      stock: 40, stockValue: 264000, unitCost: 6600
    });
  });

  it('producir no cambia el precio de venta', () => {
    const balance = applyEntry(EMPTY_BALANCE, 25, 150000);

    expect(applyExit(balance, 10).unitCost).toBe(balance.unitCost);
  });

  it('no deja stock ni valor negativos aunque se pida de más', () => {
    const balance = { stock: 5, stockValue: 33000, unitCost: 6600 };
    const emptied = applyExit(balance, 10);

    expect(emptied.stock).toBe(0);
    expect(emptied.stockValue).toBe(0);
    expect(emptied.unitCost).toBe(6600);
  });

  it('reporta el faltante en vez de esconderlo', () => {
    const balance = { stock: 5, stockValue: 33000, unitCost: 6600 };

    expect(shortfall(balance, 10)).toBe(5);
    expect(shortfall(balance, 3)).toBe(0);
  });

  it('muchas salidas seguidas no acumulan error de coma flotante', () => {
    let balance = applyEntry(EMPTY_BALANCE, 100, 333);
    for (let i = 0; i < 50; i++) balance = applyExit(balance, 1);

    expect(balance.stock).toBe(50);
    expect(balance.stockValue).toBe(50 * balance.unitCost);
  });
});

describe('replayEntries con salidas', () => {
  it('reproduce compras, consumo y merma', () => {
    const balance = replayEntries([
      entry({ id: 'a', date: '2026-01-01', quantity: 25, totalPaid: 150000 }),
      entry({ id: 'b', date: '2026-02-01', quantity: 25, totalPaid: 180000 }),
      entry({ id: 'c', date: '2026-02-10', kind: 'salida', quantity: 10, totalPaid: 0 }),
      entry({ id: 'd', date: '2026-02-20', kind: 'merma', quantity: 2, totalPaid: 0 })
    ]);

    expect(balance.stock).toBe(38);
    expect(balance.unitCost).toBe(6600);
    expect(balance.stockValue).toBe(250800);
  });
});
