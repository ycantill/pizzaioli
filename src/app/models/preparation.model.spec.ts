import { describe, expect, it } from 'vitest';
import { defaultQuantityOf, Preparation, scaledIngredients, yieldOf } from './preparation.model';

const MASA: Preparation = {
  name: 'Masa napolitana',
  ingredients: [
    { supplyId: 'harina', quantity: 1000 },
    { supplyId: 'agua', quantity: 650 },
    { supplyId: 'sal', quantity: 25 },
    { supplyId: 'levadura', quantity: 3 }
  ],
  ballWeight: 250
};

const TAPIOCA: Preparation = {
  name: 'Perlas cocidas',
  ingredients: [{ supplyId: 'tapioca', quantity: 100 }],
  yieldQuantity: 250,
  yieldUnitId: 'g'
};

describe('yieldOf', () => {
  it('sin rendimiento declarado, rinde lo que suman sus ingredientes', () => {
    expect(yieldOf(MASA)).toBe(1678);
  });

  it('con rendimiento declarado, manda el declarado', () => {
    expect(yieldOf(TAPIOCA)).toBe(250);
  });

  it('un rendimiento de cero o negativo se ignora', () => {
    expect(yieldOf({ ...TAPIOCA, yieldQuantity: 0 })).toBe(100);
    expect(yieldOf({ ...TAPIOCA, yieldQuantity: -5 })).toBe(100);
  });
});

describe('defaultQuantityOf', () => {
  it('lee el peso de bola de las masas viejas', () => {
    expect(defaultQuantityOf(MASA)).toBe(250);
  });

  it('la forma nueva manda sobre la vieja', () => {
    expect(defaultQuantityOf({ ...MASA, defaultQuantity: 300 })).toBe(300);
  });

  it('sin ninguna de las dos, no hay cantidad por defecto', () => {
    expect(defaultQuantityOf(TAPIOCA)).toBe(0);
  });
});

describe('scaledIngredients', () => {
  it('reparte el consumo entre los ingredientes del lote', () => {
    // Una bola de 250 g sobre 1678 g de masa: la harina aporta 149 g.
    const scaled = scaledIngredients(MASA, 250);

    expect(scaled[0].quantity).toBeCloseTo(1000 * 250 / 1678);
    expect(scaled.reduce((sum, i) => sum + i.quantity, 0)).toBeCloseTo(250);
  });

  it('el rendimiento traduce lo cocido a lo que se compró crudo', () => {
    // 60 g de perlas cocidas salen de 24 g de grano seco, no de 60.
    expect(scaledIngredients(TAPIOCA, 60)).toEqual([{ supplyId: 'tapioca', quantity: 24 }]);
  });

  it('consumir el lote entero gasta la receta entera', () => {
    expect(scaledIngredients(TAPIOCA, 250)).toEqual([{ supplyId: 'tapioca', quantity: 100 }]);
  });

  it('sin consumo ni rendimiento no se gasta nada', () => {
    expect(scaledIngredients(TAPIOCA, 0)).toEqual([]);
    expect(scaledIngredients({ ...TAPIOCA, yieldQuantity: 0, ingredients: [] }, 60)).toEqual([]);
  });
});
