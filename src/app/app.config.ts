import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import './firebase.config';

// La app está escrita en español: los números deben agruparse como "25.000",
// no como "25,000", que es lo que da el locale por defecto (en-US).
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideRouter(routes)
  ]
};
