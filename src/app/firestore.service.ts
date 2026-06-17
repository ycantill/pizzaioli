import { Injectable } from '@angular/core';
import { db } from './firebase.config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  
  async addDocument(collectionName: string, data: Record<string, unknown>) {
    const colRef = collection(db, collectionName);
    return await addDoc(colRef, data);
  }

  async getDocuments(collectionName: string) {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateDocument(collectionName: string, docId: string, data: Record<string, unknown>) {
    const docRef = doc(db, collectionName, docId);
    return await updateDoc(docRef, data);
  }

  async deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    return await deleteDoc(docRef);
  }
}

