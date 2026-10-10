import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LecturePlayerComponent } from './lecture-player.component';
import { FEATURED_LECTURE_MOCK } from '../../core/mock/lectures.mock';
import { PdfNotesService } from '../../core/services/pdf-notes.service';

describe('LecturePlayerComponent', () => {
  let component: LecturePlayerComponent;
  let fixture: ComponentFixture<LecturePlayerComponent>;
  let pdfNotesMock: any;

  beforeEach(async () => {
    pdfNotesMock = {
      downloadNotes: jasmine.createSpy('downloadNotes'),
    };

    await TestBed.configureTestingModule({
      imports: [LecturePlayerComponent],
      providers: [
        { provide: PdfNotesService, useValue: pdfNotesMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LecturePlayerComponent);
    component = fixture.componentInstance;
  });

  it('should render featured lecture title', () => {
    fixture.componentRef.setInput('lecture', FEATURED_LECTURE_MOCK);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain(FEATURED_LECTURE_MOCK.title.en);
  });

  it('should format seconds into M:SS', () => {
    expect((component as any).format(125)).toBe('2:05');
  });

  it('should cycle video quality', () => {
    fixture.componentRef.setInput('lecture', FEATURED_LECTURE_MOCK);
    fixture.detectChanges();

    expect((component as any).quality()).toBe('720p');
    (component as any).cycleQuality();
    expect((component as any).quality()).toBe('1080p');
    (component as any).cycleQuality();
    expect((component as any).quality()).toBe('360p');
  });
});
