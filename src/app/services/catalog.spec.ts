import { describe, expect, it } from 'vitest';
import { inferCategoryKind, rateToPricedItem, supplyToPricedItem } from './catalog.service';

describe('inferCategoryKind', () => {
  it('reconoce ingredientes y paquetería sin importar mayúsculas ni plural', () => {
    expect(inferCategoryKind('Ingrediente')).toBe('ingrediente');
    expect(inferCategoryKind('INGREDIENTES')).toBe('ingrediente');
    expect(inferCategoryKind('Paquetería')).toBe('paqueteria');
    expect(inferCategoryKind('Empaque')).toBe('paqueteria');
  });

  it('no clasifica lo que no reconoce, en vez de asumir ingrediente', () => {
    expect(inferCategoryKind('Servicio')).toBeUndefined();
    expect(inferCategoryKind('')).toBeUndefined();
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
