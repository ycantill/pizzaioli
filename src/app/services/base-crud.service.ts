import { inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FirestoreService } from '../firestore.service';
import { ConfirmDialog } from '../shared/confirm-dialog';

export abstract class BaseCrudService<T extends { id?: string }> {
  protected firestoreService = inject(FirestoreService);
  protected dialog = inject(MatDialog);
  
  items = signal<T[]>([]);
  loading = signal(true);

  protected abstract collectionName: string;
  protected abstract dialogComponent: any;
  protected abstract dialogWidth: string;

  async loadItems() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments(this.collectionName);
      this.items.set(data as T[]);
    } catch (error) {
      console.error(`Error loading ${this.collectionName}:`, error);
    } finally {
      this.loading.set(false);
    }
  }

  addItem(data: any = {}) {
    const dialogRef = this.dialog.open(this.dialogComponent, {
      width: this.dialogWidth,
      data
    });

    dialogRef.afterClosed().subscribe(async (result: T | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument(this.collectionName, result);
          this.items.update(list => [...list, { ...result, id: docRef.id }]);
        } catch (error) {
          console.error(`Error adding ${this.collectionName}:`, error);
        }
      }
    });
  }

  editItem(item: T, data: any = {}) {
    const dialogRef = this.dialog.open(this.dialogComponent, {
      width: this.dialogWidth,
      data: { ...data, [this.getItemKey()]: item }
    });

    dialogRef.afterClosed().subscribe(async (result: T | undefined) => {
      if (result && item.id) {
        try {
          await this.firestoreService.updateDocument(this.collectionName, item.id, result);
          this.items.update(list => 
            list.map(i => i.id === item.id ? { ...result, id: item.id } : i)
          );
        } catch (error) {
          console.error(`Error updating ${this.collectionName}:`, error);
        }
      }
    });
  }

  deleteItem(item: T) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: '¿Estás seguro de que deseas eliminar este elemento?' }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed && item.id) {
        try {
          await this.firestoreService.deleteDocument(this.collectionName, item.id);
          this.items.update(list => list.filter(i => i.id !== item.id));
        } catch (error) {
          console.error(`Error deleting ${this.collectionName}:`, error);
        }
      }
    });
  }

  protected getItemKey(): string {
    return this.collectionName.slice(0, -1);
  }
}
