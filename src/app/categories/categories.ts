import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupplyCategory } from '../models/supply-category.model';
import { inferCategoryKind } from '../services/catalog.service';
import { SupplyCategoriesDataService } from '../services/supply-categories-data.service';
import { CategoryDialog } from './category-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { DELETE_REQUESTED, DeleteRequested, DialogService } from '../shared/dialog.service';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories {
  private dialogs = inject(DialogService);
  private categoriesService = inject(SupplyCategoriesDataService);

  categories = this.categoriesService.categories;
  loading = this.categoriesService.isLoading;

  kindLabel(category: SupplyCategory): string {
    const kind = category.kind ?? inferCategoryKind(category.name);
    if (kind === 'paqueteria') return 'Paquetería';
    if (kind === 'ingrediente') return 'Ingrediente';
    return 'Sin clasificar';
  }

  addCategory() {
    const dialogRef = this.dialogs.openFullScreen<CategoryDialog, SupplyCategory>(CategoryDialog);

    dialogRef.afterClosed().subscribe(async (result: SupplyCategory | undefined) => {
      if (result) {
        try {
          await this.categoriesService.add(result);
        } catch (error) {
          console.error('Error adding cost type:', error);
        }
      }
    });
  }

  editCategory(category: SupplyCategory) {
    const dialogRef = this.dialogs.openFullScreen<CategoryDialog, SupplyCategory | DeleteRequested>(
      CategoryDialog, { category }
    );

    dialogRef.afterClosed().subscribe(async (result) => {
      // Borrar se pide desde la propia edición: la lista no tiene controles.
      if (result === DELETE_REQUESTED) return this.deleteCategory(category);
      if (result && category.id) {
        try {
          await this.categoriesService.update(category.id, result);
        } catch (error) {
          console.error('Error updating cost type:', error);
        }
      }
    });
  }

  deleteCategory(category: SupplyCategory) {
    const dialogRef = this.dialogs.openConfirm<ConfirmDialog, boolean>(ConfirmDialog, {
      title: 'Confirmar eliminación',
      message: `¿Eliminar la categoría "${category.name}"? Los insumos que la usen quedarán sin categoría.`
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean | undefined) => {
      if (confirmed && category.id) {
        try {
          await this.categoriesService.remove(category.id);
        } catch (error) {
          console.error('Error deleting cost type:', error);
        }
      }
    });
  }
}
