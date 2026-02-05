import { TestBed } from '@angular/core/testing';
import { DeliveryConfig } from './delivery';
import { FirestoreService } from '../firestore.service';
import { MatDialog } from '@angular/material/dialog';

describe('DeliveryConfig', () => {
  beforeEach(async () => {
    const firestoreSpy = { getDocuments: vi.fn() };
    const dialogSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DeliveryConfig],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DeliveryConfig);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
