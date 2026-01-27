import { Component, signal, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Recipe } from '../models/recipe.model';
import { Supply } from '../models/supply.model';
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
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css'
})
export class Recipes implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);
  
  recipes = signal<Recipe[]>([]);
  supplies = signal<Supply[]>([]);
  loading = signal(true);
  displayedColumns: string[] = ['name', 'type', 'ingredients', 'actions'];

  async ngOnInit() {
    await this.loadSupplies();
    await this.loadRecipes();
  }

  async loadSupplies() {
    try {
      const data = await this.firestoreService.getDocuments('supplies');
      this.supplies.set(data as Supply[]);
    } catch (error) {
      console.error('Error loading supplies:', error);
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

  getSupplyName(supplyId: string): string {
    const supply = this.supplies().find(s => s.id === supplyId);
    return supply ? supply.product : 'Desconocido';
  }

  addRecipe() {
    const dialogRef = this.dialog.open(RecipeDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { supplies: this.supplies() }
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

  editRecipe(recipe: Recipe) {
    const dialogRef = this.dialog.open(RecipeDialog, {
      width: '600px',
      maxHeight: '90vh',
      data: { recipe, supplies: this.supplies() }
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
