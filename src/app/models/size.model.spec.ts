import { describe, expect, it } from 'vitest';
import { configFor, factorOf, Size, sizesOf } from './size.model';

const PERSONAL: Size = { id: 's1', recipeTypeId: 'pizza', name: 'Personal', factor: 0.6 };
const MEDIANA: Size = { id: 's2', recipeTypeId: 'pizza', name: 'Mediana', factor: 1 };
const FAMILIAR: Size = { id: 's3', recipeTypeId: 'pizza', name: 'Familiar', factor: 1.8 };
const VASO: Size = { id: 's4', recipeTypeId: 'te', name: '22 oz', factor: 1.375 };

describe('factorOf', () => {
  it('un precio sin tamaño se cotiza en el base', () => {
    expect(factorOf(undefined)).toBe(1);
  });

  it('un factor de cero o negativo no encoge nada', () => {
    expect(factorOf({ ...MEDIANA, factor: 0 })).toBe(1);
    expect(factorOf({ ...MEDIANA, factor: -2 })).toBe(1);
  });

  it('respeta el factor declarado', () => {
    expect(factorOf(FAMILIAR)).toBe(1.8);
  });
});

describe('sizesOf', () => {
  it('devuelve los de su familia, del más chico al más grande', () => {
    const sizes = sizesOf([FAMILIAR, VASO, PERSONAL, MEDIANA], 'pizza');

    expect(sizes.map(s => s.name)).toEqual(['Personal', 'Mediana', 'Familiar']);
  });

  it('sin familia no hay tamaños', () => {
    expect(sizesOf([PERSONAL], null)).toEqual([]);
    expect(sizesOf([PERSONAL], 'crepe')).toEqual([]);
  });
});

describe('configFor', () => {
  const SIN_TAMANO = { recipeTypeId: 'pizza', items: ['caja 33'] };
  const FAMILIAR_CONF = { recipeTypeId: 'pizza', sizeId: 's3', items: ['caja 40'] };
  const OTRA_FAMILIA = { recipeTypeId: 'te', items: ['vaso'] };

  it('prefiere la del tamaño concreto', () => {
    expect(configFor([SIN_TAMANO, FAMILIAR_CONF], 'pizza', 's3')).toBe(FAMILIAR_CONF);
  });

  it('cae en la que no declara tamaño, que hace de defecto', () => {
    expect(configFor([SIN_TAMANO, FAMILIAR_CONF], 'pizza', 's1')).toBe(SIN_TAMANO);
    expect(configFor([SIN_TAMANO, FAMILIAR_CONF], 'pizza', null)).toBe(SIN_TAMANO);
  });

  it('no cruza familias', () => {
    expect(configFor([OTRA_FAMILIA], 'pizza', null)).toBeUndefined();
    expect(configFor([SIN_TAMANO], null, null)).toBeUndefined();
  });

  it('sin defecto ni coincidencia, no hay configuración', () => {
    expect(configFor([FAMILIAR_CONF], 'pizza', 's1')).toBeUndefined();
  });
});
