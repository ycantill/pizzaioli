import { describe, expect, it } from 'vitest';
import {
  normalizeConsumption,
  normalizeDough,
  normalizePackaging,
  normalizeTopping
} from './legacy-fields';

describe('normalización de documentos viejos', () => {
  it('una masa vieja adopta supplyId sin perder el resto', () => {
    const dough = normalizeDough({
      id: 'd1', name: 'Napolitana', ballWeight: 250,
      ingredients: [{ costId: 'harina', quantity: 1000 }]
    } as never);

    expect(dough.ingredients[0].supplyId).toBe('harina');
    expect(dough.ingredients[0].quantity).toBe(1000);
  });

  it('un documento ya migrado se deja como está', () => {
    const topping = normalizeTopping({
      id: 't1', supplyId: 'queso', quantity: 80, size: 'M', salsaBase: false
    });

    expect(topping.supplyId).toBe('queso');
  });

  it('el nombre nuevo gana si por alguna razón conviven los dos', () => {
    const topping = normalizeTopping({
      id: 't1', supplyId: 'queso', costId: 'viejo', quantity: 80, size: 'M', salsaBase: false
    } as never);

    expect(topping.supplyId).toBe('queso');
  });

  it('la paquetería normaliza cada ítem del arreglo', () => {
    const packaging = normalizePackaging({
      id: 'p1', recipeTypeId: 'rt1',
      items: [{ costId: 'caja', quantity: 1 }, { supplyId: 'servilleta', quantity: 2 }]
    } as never);

    expect(packaging.items.map(i => i.supplyId)).toEqual(['caja', 'servilleta']);
  });

  it('un consumo viejo pasa a rateId, no a supplyId', () => {
    expect(normalizeConsumption({ id: 'c1', name: 'Horno', costId: 'gas', quantity: 2 } as never))
      .toMatchObject({ rateId: 'gas' });
  });

  it('un arreglo ausente no rompe la normalización', () => {
    expect(normalizeDough({ id: 'd1', name: 'X', ballWeight: 250 } as never).ingredients)
      .toEqual([]);
  });
});
