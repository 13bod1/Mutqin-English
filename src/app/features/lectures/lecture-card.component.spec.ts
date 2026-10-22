import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LectureCardComponent } from './lecture-card.component';
import { LECTURES_MOCK } from '../../core/mock/lectures.mock';
import { PdfNotesService } from '../../core/services/pdf-notes.service';

describe('LectureCardComponent', () => {
  let component: LectureCardComponent;
  let fixture: ComponentFixture<LectureCardComponent>;
  let pdfNotesMock: any;

  beforeEach(async () => {
    pdfNotesMock = {
      downloadNotes: jasmine.createSpy('downloadNotes'),
    };

    await TestBed.configureTestingModule({
      imports: [LectureCardComponent],
      providers: [
        { provide: PdfNotesService, useValue: pdfNotesMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LectureCardComponent);
    component = fixture.componentInstance;
  });

  it('should render lecture details', () => {
    fixture.componentRef.setInput('lecture', LECTURES_MOCK[0]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain(LECTURES_MOCK[0].title.en);
  });

  it('should call pdfNotes.downloadNotes when download button is clicked', () => {
    fixture.componentRef.setInput('lecture', LECTURES_MOCK[0]);
    fixture.detectChanges();

    (component as any).downloadPdf();
    expect(pdfNotesMock.downloadNotes).toHaveBeenCalled();
  });
});
