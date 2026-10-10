import { TestBed } from '@angular/core/testing';
import { PdfNotesService } from './pdf-notes.service';

describe('PdfNotesService', () => {
  let service: PdfNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PdfNotesService],
    });
    service = TestBed.inject(PdfNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle downloadNotes without error (using fallback window/blob)', () => {
    const windowSpy = spyOn(window, 'open').and.returnValue(null);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

    service.downloadNotes('l1', 'Vocabulary Demystified', 'Unit 1');

    expect(windowSpy).toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
  });
});
