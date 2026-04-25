import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import './firebase.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes)
  ]
};
