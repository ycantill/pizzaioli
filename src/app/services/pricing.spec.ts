import { describe, expect, it } from 'vitest';
import { MarginConfig } from '../models/margin-config.model';
import { PricedItem } from '../models/priced-item.model';
import {
  buildLaborLineItem,
  buildLineItem,
  excludingRecovery,
  isRecoveryOnly,
  marginPercent,
  subtotal
} from './pricing';

const MARGIN_90: MarginConfig = {
  recoveryPercentage: 40, reinvestmentPercentage: 30, profitPercentage: 20
};
const MARGIN_300: MarginConfig = {
  recoveryPercentage: 100, reinvestmentPercentage: 100, profitPercentage: 100
};
const RECOVERY_ONLY: MarginConfig = {
  recoveryPercentage: 50, reinvestmentPercentage: 0, profitPercentage: 0
};

function item(unitCost: number, margin: MarginConfig): PricedItem {
  return { id: 'x', name: 'Harina', unitId: 'g', unitCost, margin };
}

describe('marginPercent', () => {
  it('suma los tres porcentajes', () => {
    expect(marginPercent(MARGIN_90)).toBe(90);
  });

  it('sin margen da cero, y por lo tanto la línea no aporta precio', () => {
    expect(marginPercent(undefined)).toBe(0);
    expect(buildLineItem(item(6.5, undefined as unknown as MarginConfig), 3).roundedCost).toBe(0);
  });
});

describe('isRecoveryOnly', () => {
  it('es cierto solo si recupera y no reinvierte ni gana', () => {
    expect(isRecoveryOnly(RECOVERY_ONLY)).toBe(true);
    expect(isRecoveryOnly(MARGIN_90)).toBe(false);
    expect(isRecoveryOnly({ ...RECOVERY_ONLY, recoveryPercentage: 0 })).toBe(false);
    expect(isRecoveryOnly(undefined)).toBe(false);
  });
});

describe('buildLineItem', () => {
  it('el margen multiplica el costo base, no lo recarga', () => {
    // 300 % sobre 19.5 son 58.5, no 78.
    expect(buildLineItem(item(6.5, MARGIN_300), 3).costWithMargin).toBe(58.5);
  });

  it('calcula la línea completa', () => {
    expect(buildLineItem(item(6.5, MARGIN_90), 3)).toEqual({
      name: 'Harina',
      quantity: 3,
      unitCost: 6.5,
      baseCost: 19.5,
      marginPercent: 90,
      costWithMargin: 17.55,
      roundedCost: 100,
      isRecoveryOnly: false
    });
  });

  it('aplica el margen sobre el costo sin redondear', () => {
    // Con la base redondeada primero (3.01) daría 9.03; con la cruda, 9.04.
    expect(buildLineItem(item(1.0049, MARGIN_300), 3).costWithMargin).toBe(9.04);
  });

  it('redondea el costo con margen hacia arriba al siguiente múltiplo de 100', () => {
    expect(buildLineItem(item(100, MARGIN_300), 1).roundedCost).toBe(300);
    expect(buildLineItem(item(100.01, MARGIN_300), 1).roundedCost).toBe(400);
  });

  it('permite renombrar la línea y arrastrar el id del topping', () => {
    const line = buildLineItem(item(6.5, MARGIN_90), 3, {
      name: 'Harina (M)', toppingId: 't1'
    });

    expect(line.name).toBe('Harina (M)');
    expect(line.toppingId).toBe('t1');
  });

  it('no agrega toppingId cuando no se pide', () => {
    expect(buildLineItem(item(6.5, MARGIN_90), 3)).not.toHaveProperty('toppingId');
  });

  it('marca la línea que solo recupera inversión', () => {
    expect(buildLineItem(item(6.5, RECOVERY_ONLY), 3).isRecoveryOnly).toBe(true);
  });
});

describe('buildLaborLineItem', () => {
  it('cotiza el consumo por hora durante los minutos indicados', () => {
    // 2 unidades/hora a $500 son $1000/hora; 30 minutos son media hora.
    expect(buildLaborLineItem('Horno', item(500, MARGIN_90), 2, 30)).toEqual({
      name: 'Horno',
      hours: 0.5,
      batchSize: 1,
      costPerHour: 1000,
      baseCost: 500,
      marginPercent: 90,
      costWithMargin: 450,
      roundedCost: 500,
      isRecoveryOnly: false
    });
  });

  it('reparte los minutos de la tanda entre las unidades que rinde', () => {
    // Los mismos 30 minutos de horno, pero salen 4 pizzas: 7,5 minutos cada una.
    const line = buildLaborLineItem('Horno', item(500, MARGIN_90), 2, 30, 4);

    expect(line.hours).toBe(0.125);
    expect(line.baseCost).toBe(125);
    expect(line.batchSize).toBe(4);
  });

  it('una tanda de cero o de una no reparte nada', () => {
    const whole = buildLaborLineItem('Horno', item(500, MARGIN_90), 2, 30).baseCost;

    expect(buildLaborLineItem('Horno', item(500, MARGIN_90), 2, 30, 1).baseCost).toBe(whole);
    expect(buildLaborLineItem('Horno', item(500, MARGIN_90), 2, 30, 0).baseCost).toBe(whole);
  });
});

describe('subtotal', () => {
  it('suma base y margen redondeando el total, y acumula el costo ya redondeado', () => {
    const items = [
      buildLineItem(item(6.5, MARGIN_90), 3),
      buildLineItem(item(1.25, MARGIN_90), 2)
    ];

    expect(subtotal(items)).toEqual({
      baseCost: 22,
      costWithMargin: 19.8,
      roundedCost: 200
    });
  });

  it('un subtotal vacío es cero', () => {
    expect(subtotal([])).toEqual({ baseCost: 0, costWithMargin: 0, roundedCost: 0 });
  });
});

describe('excludingRecovery', () => {
  it('descarta las líneas que solo recuperan inversión', () => {
    const items = [
      buildLineItem(item(6.5, MARGIN_90), 3),
      buildLineItem(item(6.5, RECOVERY_ONLY), 3)
    ];

    expect(excludingRecovery(items)).toHaveLength(1);
  });
});
