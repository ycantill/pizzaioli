import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDaSTjA_Ux_l4yrx7wjP8KGWgks1CLCLRI',
  authDomain: 'pizzaioli-45c55.firebaseapp.com',
  projectId: 'pizzaioli-45c55',
  storageBucket: 'pizzaioli-45c55.firebasestorage.app',
  messagingSenderId: '30334595297',
  appId: '1:30334595297:web:c15054182e8d86dd9e47a0',
  measurementId: 'G-MZWXCCYFWN'
};

// Inicializa Firebase
export const app = initializeApp(firebaseConfig);

// Inicializa Firestore
export const db = getFirestore(app);
