import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Recipe } from '../models/recipe.model';
import { Topping } from '../models/topping.model';
import { Cost } from '../models/cost.model';
import { RecipeType } from '../models/recipe-type.model';
import { FirestoreService } from '../firestore.service';
import { RecipeDialog } from './recipe-dialog';
import { ConfirmDialog } from '../shared/confirm-dialog';

@Component({
  selector: 'app-recipes',
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
export class Recipes implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  recipes = signal<Recipe[]>([]);
  toppings = signal<Topping[]>([]);
  costs = signal<Cost[]>([]);
  recipeTypes = signal<RecipeType[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'type', 'toppings', 'actions'];

  async ngOnInit() {
    await this.loadRecipeTypes();
    await Promise.all([this.loadCosts(), this.loadToppings()]);
    await this.loadRecipes();
  }

  async loadRecipeTypes() {
    try {
      const data = await this.firestoreService.getDocuments('recipe-types');
      this.recipeTypes.set(data as RecipeType[]);
    } catch (error) {
      console.error('Error loading recipe types:', error);
    }
  }

  async loadCosts() {
    try {
      const data = await this.firestoreService.getDocuments('costs');
      this.costs.set(data as Cost[]);
    } catch (error) {
      console.error('Error loading costs:', error);
    }
  }

  async loadToppings() {
    try {
      const data = await this.firestoreService.getDocuments('toppings');
      this.toppings.set(data as Topping[]);
    } catch (error) {
      console.error('Error loading toppings:', error);
    }
  }

  async loadRecipes() {
    try {
      this.loading.set(true);
      const data = await this.firestoreService.getDocuments('recipes');
      this.recipes.set(data as Recipe[]);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getToppingLabel(toppingId: string): string {
    const topping = this.toppings().find(t => t.id === toppingId);
    if (!topping) return 'Desconocido';
    const cost = this.costs().find(c => c.id === topping.costId);
    return `${cost?.product ?? 'Desconocido'} — ${topping.size} (${topping.quantity})`;
  }

  getRecipeItems(recipe: Recipe): string[] {
    return recipe.toppings.map(id => this.getToppingLabel(id));
  }

  getRecipeTypeName(recipeTypeId: string): string {
    const type = this.recipeTypes().find(t => t.id === recipeTypeId);
    return type ? type.name : 'Desconocido';
  }

  openPrintWindow() {
    const allToppings = this.toppings();
    const allCosts = this.costs();

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
      data: { toppings: this.toppings(), costs: this.costs(), recipeTypes: this.recipeTypes() }
    });

    dialogRef.afterClosed().subscribe(async (result: Recipe | undefined) => {
      if (result) {
        try {
          const docRef = await this.firestoreService.addDocument('recipes', result);
          this.recipes.update(list => [...list, { ...result, id: docRef.id }]);
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
      const docRef = await this.firestoreService.addDocument('recipes', copy);
      this.recipes.update(list => [...list, { ...copy, id: docRef.id }]);
    } catch (error) {
      console.error('Error duplicating recipe:', error);
    }
  }

  editRecipe(recipe: Recipe) {
    const dialogRef = this.dialog.open(RecipeDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { recipe, toppings: this.toppings(), costs: this.costs(), recipeTypes: this.recipeTypes() }
    });

    dialogRef.afterClosed().subscribe(async (result: Recipe | undefined) => {
      if (result && recipe.id) {
        try {
          await this.firestoreService.updateDocument('recipes', recipe.id, result);
          this.recipes.update(list => 
            list.map(r => r.id === recipe.id ? { ...result, id: recipe.id } : r)
          );
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
          await this.firestoreService.deleteDocument('recipes', recipe.id!);
          this.recipes.update(list => list.filter(r => r.id !== recipe.id));
        } catch (error) {
          console.error('Error deleting recipe:', error);
        }
      }
    });
  }
}
