import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Recipe } from '../models/recipe.model';
import { CostsDataService } from '../services/costs-data.service';
import { ToppingsDataService } from '../services/toppings-data.service';
import { RecipeTypesDataService } from '../services/recipe-types-data.service';
import { RecipesDataService } from '../services/recipes-data.service';
import { RecipeDialog } from './recipe-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-recipes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css'
})
export class Recipes {
  private dialog = inject(MatDialog);
  private costsService = inject(CostsDataService);
  private toppingsService = inject(ToppingsDataService);
  private recipeTypesService = inject(RecipeTypesDataService);
  private recipesService = inject(RecipesDataService);

  recipes = this.recipesService.recipes;
  loading = computed(() =>
    this.recipeTypesService.isLoading() || this.costsService.isLoading() ||
    this.toppingsService.isLoading() || this.recipesService.isLoading()
  );
  displayedColumns: string[] = ['name', 'type', 'toppings', 'actions'];

  getToppingLabel(toppingId: string): string {
    const topping = this.toppingsService.toppings().find(t => t.id === toppingId);
    if (!topping) return 'Desconocido';
    const cost = this.costsService.costs().find(c => c.id === topping.costId);
    return `${cost?.product ?? 'Desconocido'} — ${topping.size} (${topping.quantity})`;
  }

  getRecipeItems(recipe: Recipe): string[] {
    return recipe.toppings.map(id => this.getToppingLabel(id));
  }

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypesService.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  openPrintWindow() {
    const allToppings = this.toppingsService.toppings();
    const allCosts = this.costsService.costs();

    const recipesHtml = this.recipes().map(recipe => {
      const toppingRows = recipe.toppings.map(toppingId => {
        const topping = allToppings.find(t => t.id === toppingId);
        if (!topping) return '';
        const cost = allCosts.find(c => c.id === topping.costId);
        if (!cost) return '';
        return `<tr><td>${cost.product}</td><td>${topping.size}</td><td>${topping.quantity}g</td></tr>`;
      }).join('');

      return `
        <div class="recipe">
          <h2>${recipe.name}</h2>
          <table>
            <thead><tr><th>Ingrediente</th><th>Tamaño</th><th>Cantidad</th></tr></thead>
            <tbody>${toppingRows}</tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recetas</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { font-size: 1.4rem; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .recipe { border: 1px solid #ccc; border-radius: 4px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .recipe h2 { font-size: 1rem; margin: 0; padding: 8px 10px; background: #f0f0f0; border-bottom: 1px solid #ccc; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
    th { text-align: left; padding: 4px 10px; background: #fafafa; border-bottom: 1px solid #ddd; color: #555; }
    td { padding: 4px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 0; } .grid { grid-template-columns: repeat(3, 1fr); } }
  </style>
</head>
<body>
  <h1>Recetas</h1>
  <div class="grid">${recipesHtml}</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  addRecipe() {
    const dialogRef = this.dialog.open(RecipeDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        toppings: this.toppingsService.toppings(),
        costs: this.costsService.costs(),
        recipeTypes: this.recipeTypesService.recipeTypes()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Recipe | undefined) => {
      if (result) {
        try {
          await this.recipesService.add(result);
        } catch (error) {
          console.error('Error adding recipe:', error);
        }
      }
    });
  }

  async duplicateRecipe(recipe: Recipe) {
    const copy: Recipe = {
      name: `${recipe.name} (copia)`,
      recipeTypeId: recipe.recipeTypeId,
      toppings: [...recipe.toppings],
    };
    try {
      await this.recipesService.add(copy);
    } catch (error) {
      console.error('Error duplicating recipe:', error);
    }
  }

  editRecipe(recipe: Recipe) {
    const dialogRef = this.dialog.open(RecipeDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        recipe,
        toppings: this.toppingsService.toppings(),
        costs: this.costsService.costs(),
        recipeTypes: this.recipeTypesService.recipeTypes()
      }
    });

    dialogRef.afterClosed().subscribe(async (result: Recipe | undefined) => {
      if (result && recipe.id) {
        try {
          await this.recipesService.update(recipe.id, result);
        } catch (error) {
          console.error('Error updating recipe:', error);
        }
      }
    });
  }

  async deleteRecipe(recipe: Recipe) {
    if (!recipe.id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar "${recipe.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.recipesService.remove(recipe.id!);
        } catch (error) {
          console.error('Error deleting recipe:', error);
        }
      }
    });
  }
}
