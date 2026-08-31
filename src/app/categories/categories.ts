import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { SupplyCategory } from '../models/supply-category.model';
import { inferCategoryKind } from '../services/catalog.service';
import { SupplyCategoriesDataService } from '../services/supply-categories-data.service';
import { CategoryDialog } from './category-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories {
  private dialog = inject(MatDialog);
  private categoriesService = inject(SupplyCategoriesDataService);

  categories = this.categoriesService.categories;
  loading = this.categoriesService.isLoading;
  displayedColumns: string[] = ['name', 'kind', 'actions'];

  kindLabel(category: SupplyCategory): string {
    const kind = category.kind ?? inferCategoryKind(category.name);
    if (kind === 'paqueteria') return 'Paquetería';
    if (kind === 'ingrediente') return 'Ingrediente';
    return 'Sin clasificar';
  }

  addCategory() {
    const dialogRef = this.dialog.open(CategoryDialog, {
      width: '400px'
    });

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
    const dialogRef = this.dialog.open(CategoryDialog, {
      width: '400px',
      data: { category }
    });

    dialogRef.afterClosed().subscribe(async (result: SupplyCategory | undefined) => {
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
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
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
