import { describe, expect, it } from 'vitest';
import { inferCostTypeKind, rateToPricedItem, supplyToPricedItem } from './catalog.service';

describe('inferCostTypeKind', () => {
  it('reconoce ingredientes y paquetería sin importar mayúsculas ni plural', () => {
    expect(inferCostTypeKind('Ingrediente')).toBe('ingrediente');
    expect(inferCostTypeKind('INGREDIENTES')).toBe('ingrediente');
    expect(inferCostTypeKind('Paquetería')).toBe('paqueteria');
    expect(inferCostTypeKind('Empaque')).toBe('paqueteria');
  });

  it('no clasifica lo que no reconoce, en vez de asumir ingrediente', () => {
    expect(inferCostTypeKind('Servicio')).toBeUndefined();
    expect(inferCostTypeKind('')).toBeUndefined();
  });
});

describe('proyección a PricedItem', () => {
  const margin = { recoveryPercentage: 40, reinvestmentPercentage: 30, profitPercentage: 20 };

  it('un insumo aporta su PPP como costo unitario', () => {
    expect(supplyToPricedItem({
      id: 'harina', name: 'Harina', unitId: 'g', categoryId: 'c1',
      stock: 50, stockValue: 330, unitCost: 6.6, margin
    })).toEqual({ id: 'harina', name: 'Harina', unitId: 'g', unitCost: 6.6, margin });
  });

  it('una tarifa aporta su valor manual, y queda indistinguible para el pricing', () => {
    expect(rateToPricedItem({ id: 'luz', name: 'Energía', unitId: 'kwh', value: 571, margin }))
      .toEqual({ id: 'luz', name: 'Energía', unitId: 'kwh', unitCost: 571, margin });
  });
});
