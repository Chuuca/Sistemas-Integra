import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

registerLocaleData(localeEsMx);

const firebaseConfig = {
  apiKey: 'AIzaSyAuxz31236rB1qUFEuPwY2ne3zBEBQGC3A',
  authDomain: 'sistemasintegra.firebaseapp.com',
  projectId: 'sistemasintegra',
  storageBucket: 'sistemasintegra.firebasestorage.app',
  messagingSenderId: '1040980488887',
  appId: '1:1040980488887:web:64640fdf16f52ade569332'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'es-MX' }
  ]
};