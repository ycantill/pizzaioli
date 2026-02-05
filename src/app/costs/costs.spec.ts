import { TestBed } from '@angular/core/testing';
import { Costs } from './costs';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';

describe('Costs', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Costs],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Costs);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
