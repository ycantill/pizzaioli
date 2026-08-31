import { describe, expect, it } from 'vitest';
import { Unit } from '../models/unit.model';
import { areCompatible, compatibleUnits, convert, describeUnit } from './unit-conversion';

const g: Unit = { id: 'g', name: 'Gramo', abbreviation: 'g' };
const kg: Unit = { id: 'kg', name: 'Kilogramo', abbreviation: 'Kg' };
const ml: Unit = { id: 'ml', name: 'Mililitro', abbreviation: 'ml' };
const l: Unit = { id: 'l', name: 'Litro', abbreviation: 'L' };
const unidad: Unit = { id: 'u', name: 'Unidad', abbreviation: 'unidad' };
const raro: Unit = { id: 'x', name: 'Bulto', abbreviation: 'bulto' };

describe('describeUnit', () => {
  it('no distingue mayúsculas ni espacios', () => {
    expect(describeUnit({ ...kg, abbreviation: ' KG ' })?.factor).toBe(1000);
  });

  it('no adivina las unidades que no conoce', () => {
    expect(describeUnit(raro)).toBeUndefined();
    expect(describeUnit(undefined)).toBeUndefined();
  });
});

describe('areCompatible', () => {
  it('agrupa por dimensión', () => {
    expect(areCompatible(g, kg)).toBe(true);
    expect(areCompatible(ml, l)).toBe(true);
    expect(areCompatible(g, ml)).toBe(false);
    expect(areCompatible(unidad, kg)).toBe(false);
  });

  it('una unidad desconocida no es compatible con nada', () => {
    expect(areCompatible(raro, kg)).toBe(false);
    expect(areCompatible(raro, raro)).toBe(false);
  });
});

describe('convert', () => {
  it('convierte peso en ambos sentidos', () => {
    expect(convert(25, kg, g)).toBe(25000);
    expect(convert(500, g, kg)).toBe(0.5);
  });

  it('convierte volumen', () => {
    expect(convert(2, l, ml)).toBe(2000);
  });

  it('la conversión a la misma unidad no altera la cantidad', () => {
    expect(convert(7.5, kg, kg)).toBe(7.5);
  });

  it('se niega a convertir entre dimensiones distintas', () => {
    expect(convert(1, kg, l)).toBeUndefined();
  });

  it('se niega a convertir una unidad desconocida en vez de asumir kilos', () => {
    expect(convert(1, raro, g)).toBeUndefined();
  });
});

describe('compatibleUnits', () => {
  it('lista solo las unidades de la misma dimensión', () => {
    expect(compatibleUnits([g, kg, ml, l, unidad], kg)).toEqual([g, kg]);
  });

  it('si la base es desconocida, solo se admite ella misma', () => {
    expect(compatibleUnits([g, kg, raro], raro)).toEqual([raro]);
  });
});
