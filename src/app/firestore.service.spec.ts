import { TestBed } from '@angular/core/testing';
import { FirestoreService } from './firestore.service';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Mock de Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getFirestore: vi.fn()
}));

vi.mock('./firebase.config', () => ({
  db: {},
  app: {}
}));

describe('FirestoreService', () => {
  let service: FirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirestoreService);
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addDocument', () => {
    it('should add a document to a collection', async () => {
      const mockDocRef = { id: 'test-id' };
      const mockData = { name: 'Test' };
      
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any);

      const result = await service.addDocument('test-collection', mockData);

      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();
      expect(result).toEqual(mockDocRef);
    });
  });

  describe('getDocuments', () => {
    it('should get all documents from a collection', async () => {
      const mockDocs = [
        { id: '1', data: () => ({ name: 'Doc1' }) },
        { id: '2', data: () => ({ name: 'Doc2' }) }
      ];
      
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs
      } as any);

      const result = await service.getDocuments('test-collection');

      expect(collection).toHaveBeenCalled();
      expect(getDocs).toHaveBeenCalled();
      expect(result).toEqual([
        { id: '1', name: 'Doc1' },
        { id: '2', name: 'Doc2' }
      ]);
    });
  });

  describe('updateDocument', () => {
    it('should update a document', async () => {
      const mockData = { name: 'Updated' };
      
      vi.mocked(doc).mockReturnValue({} as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await service.updateDocument('test-collection', 'doc-id', mockData);

      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      vi.mocked(doc).mockReturnValue({} as any);
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await service.deleteDocument('test-collection', 'doc-id');

      expect(doc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
