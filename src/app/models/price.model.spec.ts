import { describe, expect, it } from 'vitest';
import { preparationsOf } from './price.model';

describe('preparationsOf', () => {
  it('lee la forma nueva: varias preparaciones con su cantidad', () => {
    expect(preparationsOf({
      name: 'Té de burbujas', price: 12000,
      preparations: [
        { preparationId: 'te', quantity: 200 },
        { preparationId: 'perlas', quantity: 60 }
      ]
    })).toHaveLength(2);
  });

  it('un precio viejo se lee como una sola preparación: su masa', () => {
    // Es lo que garantiza que las pizzas ya guardadas sigan costando igual.
    expect(preparationsOf({
      name: 'Margarita', price: 30000, doughId: 'masa', ballWeight: 250
    })).toEqual([{ preparationId: 'masa', quantity: 250 }]);
  });

  it('la forma nueva manda sobre la vieja', () => {
    expect(preparationsOf({
      name: 'Margarita', price: 30000,
      doughId: 'masa', ballWeight: 250,
      preparations: [{ preparationId: 'masa', quantity: 300 }]
    })).toEqual([{ preparationId: 'masa', quantity: 300 }]);
  });

  it('un precio sin masa ni preparaciones no consume nada', () => {
    expect(preparationsOf({ name: 'Gaseosa', price: 4000 })).toEqual([]);
    expect(preparationsOf({ name: 'Gaseosa', price: 4000, doughId: 'masa' })).toEqual([]);
  });
});
