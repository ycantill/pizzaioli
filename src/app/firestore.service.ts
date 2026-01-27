import { Injectable } from '@angular/core';
import { db } from './firebase.config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type CollectionReference,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  
  /**
   * Añade un documento a una colección
   */
  async addDocument(collectionName: string, data: any) {
    const colRef = collection(db, collectionName);
    return await addDoc(colRef, data);
  }

  /**
   * Obtiene un documento por ID
   */
  async getDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }

  /**
   * Obtiene todos los documentos de una colección
   */
  async getDocuments(collectionName: string, ...queryConstraints: QueryConstraint[]) {
    const colRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Actualiza un documento
   */
  async updateDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(db, collectionName, docId);
    return await updateDoc(docRef, data);
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    return await deleteDoc(docRef);
  }

  /**
   * Obtiene una referencia a una colección
   */
  getCollection(collectionName: string): CollectionReference<DocumentData> {
    return collection(db, collectionName);
  }
}
