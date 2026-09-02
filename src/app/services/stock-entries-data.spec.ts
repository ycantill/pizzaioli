import { describe, expect, it } from 'vitest';
import { StockEntry } from '../models/stock-entry.model';
import { normalizeEntry } from './stock-entries-data.service';

function legacy(kind: string): StockEntry {
  return {
    id: 'e1', supplyId: 'harina', date: '2026-01-01', kind: kind as StockEntry['kind'],
    quantity: 2, unitId: 'g', totalPaid: 0, unitCost: 6
  };
}

describe('normalizeEntry', () => {
  it('convierte la merma vieja en una salida con motivo', () => {
    expect(normalizeEntry(legacy('merma'))).toMatchObject({
      kind: 'salida',
      reason: 'merma'
    });
  });

  it('sin esto la auditoría sumaría stock en vez de restarlo', () => {
    // replayEntries manda al caso de compra todo lo que no reconoce.
    expect(normalizeEntry(legacy('merma')).kind).not.toBe('merma');
  });

  it('deja intactos los movimientos que ya usan el modelo nuevo', () => {
    const entry = { ...legacy('salida'), reason: 'produccion' as const };

    expect(normalizeEntry(entry)).toBe(entry);
  });

  it('no toca las compras ni los conteos', () => {
    expect(normalizeEntry(legacy('entrada')).kind).toBe('entrada');
    expect(normalizeEntry(legacy('ajuste')).kind).toBe('ajuste');
  });
});
