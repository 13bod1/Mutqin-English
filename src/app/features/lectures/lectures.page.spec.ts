import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LecturesPage } from './lectures.page';
import { LectureService } from '../../core/data/lecture.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LECTURES_MOCK, FEATURED_LECTURE_MOCK } from '../../core/mock/lectures.mock';

describe('LecturesPage', () => {
  let component: LecturesPage;
  let fixture: ComponentFixture<LecturesPage>;
  let lectureServiceMock: any;

  beforeEach(async () => {
    lectureServiceMock = {
      getLectures: jasmine.createSpy('getLectures').and.returnValue(of(LECTURES_MOCK)),
      getContinueWatching: jasmine.createSpy('getContinueWatching').and.returnValue(of([])),
      getFeaturedLecture: jasmine.createSpy('getFeaturedLecture').and.returnValue(of(FEATURED_LECTURE_MOCK)),
    };

    await TestBed.configureTestingModule({
      imports: [LecturesPage],
      providers: [
        provideRouter([]),
        LanguageService,
        { provide: LectureService, useValue: lectureServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LecturesPage);
    component = fixture.componentInstance;
  });

  it('should create LecturesPage', () => {
    expect(component).toBeTruthy();
  });

  it('should filter lectures by topic', () => {
    fixture.detectChanges();
    (component as any).toggle('topic', 'grammar');

    expect((component as any).filters().topic).toBe('grammar');
    expect((component as any).hasFilters()).toBeTrue();
  });

  it('should clear all filters', () => {
    fixture.detectChanges();
    (component as any).toggle('topic', 'grammar');
    (component as any).clear();

    expect((component as any).filters().topic).toBeNull();
    expect((component as any).hasFilters()).toBeFalse();
  });

  it('should play selected lecture in player', () => {
    fixture.detectChanges();
    const l = LECTURES_MOCK[0];
    (component as any).playLecture(l);

    expect((component as any).selectedLecture()).toBeTruthy();
  });
});
