import { Injectable } from '@angular/core';
import { db } from './firebase.config';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
} from 'firebase/firestore';

/** Firestore acepta como máximo 500 operaciones por batch. */
const BATCH_LIMIT = 500;

export type BatchOperation =
  | { type: 'set'; collection: string; id: string; data: object }
  | {
      type: 'update';
      collection: string;
      id: string;
      data: object;
      /** Campos a eliminar del documento en la misma operación. */
      deleteFields?: string[];
    }
  | { type: 'delete'; collection: string; id: string };

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  async addDocument(collectionName: string, data: object) {
    const colRef = collection(db, collectionName);
    return await addDoc(colRef, data as Record<string, unknown>);
  }

  /** Crea o reemplaza un documento con un id explícito. */
  async setDocument(collectionName: string, docId: string, data: object) {
    const docRef = doc(db, collectionName, docId);
    return await setDoc(docRef, data as Record<string, unknown>);
  }

  /** Reserva un id sin escribir nada, para armar lotes antes de enviarlos. */
  newId(collectionName: string): string {
    return doc(collection(db, collectionName)).id;
  }

  async getDocuments(collectionName: string) {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateDocument(collectionName: string, docId: string, data: object) {
    const docRef = doc(db, collectionName, docId);
    return await updateDoc(docRef, data as Record<string, unknown>);
  }

  async deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    return await deleteDoc(docRef);
  }

  /**
   * Ejecuta operaciones en lotes de 500. Cada lote es atómico, pero el
   * conjunto no lo es: si un lote falla, los anteriores ya se escribieron.
   * Por eso las operaciones deben ser idempotentes (usar 'set', no 'add').
   */
  async commitBatch(operations: BatchOperation[]): Promise<void> {
    for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);

      for (const operation of operations.slice(i, i + BATCH_LIMIT)) {
        const docRef = doc(db, operation.collection, operation.id);

        if (operation.type === 'set') {
          batch.set(docRef, operation.data as Record<string, unknown>);
        } else if (operation.type === 'update') {
          const removals = Object.fromEntries(
            (operation.deleteFields ?? []).map(field => [field, deleteField()])
          );
          batch.update(docRef, { ...operation.data, ...removals } as Record<string, unknown>);
        } else {
          batch.delete(docRef);
        }
      }

      await batch.commit();
    }
  }
}
