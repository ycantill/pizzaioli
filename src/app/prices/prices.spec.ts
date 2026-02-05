import { TestBed } from '@angular/core/testing';
import { Prices } from './prices';
import { FirestoreService } from '../firestore.service';

describe('Prices', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Prices],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Prices);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
