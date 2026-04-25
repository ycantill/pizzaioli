import { TestBed } from '@angular/core/testing';
import { RecipeTypes } from './recipe-types';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';

describe('RecipeTypes', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RecipeTypes],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RecipeTypes);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
