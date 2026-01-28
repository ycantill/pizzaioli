import { Component, signal, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecipeType } from '../models/recipe-type.model';
import { FirestoreService } from '../firestore.service';
import { RecipeTypeDialog } from './recipe-type-dialog';

@Component({
  selector: 'app-recipe-types',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './recipe-types.html',
  styleUrl: './recipe-types.css'
})
export class RecipeTypes implements OnInit {
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  recipeTypes = signal<RecipeType[]>([]);
  displayedColumns: string[] = ['name', 'actions'];

  async ngOnInit() {
    await this.loadRecipeTypes();
  }

  async loadRecipeTypes() {
    try {
      const data = await this.firestoreService.getDocuments('recipe-types');
      this.recipeTypes.set(data as RecipeType[]);
    } catch (error) {
      console.error('Error loading recipe types:', error);
    }
  }

  openDialog(recipeType?: RecipeType) {
    const dialogRef = this.dialog.open(RecipeTypeDialog, {
      width: '400px',
      data: recipeType || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (recipeType?.id) {
          this.updateRecipeType(recipeType.id, result);
        } else {
          this.addRecipeType(result);
        }
      }
    });
  }

  async addRecipeType(recipeType: RecipeType) {
    try {
      await this.firestoreService.addDocument('recipe-types', recipeType);
      await this.loadRecipeTypes();
    } catch (error) {
      console.error('Error adding recipe type:', error);
    }
  }

  async updateRecipeType(id: string, recipeType: RecipeType) {
    try {
      await this.firestoreService.updateDocument('recipe-types', id, recipeType);
      await this.loadRecipeTypes();
    } catch (error) {
      console.error('Error updating recipe type:', error);
    }
  }

  async deleteRecipeType(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este tipo de receta?')) {
      try {
        await this.firestoreService.deleteDocument('recipe-types', id);
        await this.loadRecipeTypes();
      } catch (error) {
        console.error('Error deleting recipe type:', error);
      }
    }
  }
}
