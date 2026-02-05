import { TestBed } from '@angular/core/testing';
import { DoughCalculator } from './dough-calculator';
import { FirestoreService } from '../firestore.service';

describe('DoughCalculator', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DoughCalculator],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DoughCalculator);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
