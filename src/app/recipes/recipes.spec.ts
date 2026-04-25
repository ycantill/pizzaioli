import { TestBed } from '@angular/core/testing';
import { Recipes } from './recipes';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';

describe('Recipes', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Recipes],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Recipes);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
