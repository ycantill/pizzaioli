import { TestBed } from '@angular/core/testing';
import { Doughs } from './doughs';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';

describe('Doughs', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Doughs],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Doughs);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
