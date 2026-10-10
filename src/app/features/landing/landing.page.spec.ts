import { ComponentFixture, TestBed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LandingPage } from './landing.page';
import { ContentService } from '../../core/data/content.service';
import { PLATFORM_STATS_MOCK, INSTRUCTOR_MOCK, TESTIMONIALS_MOCK } from '../../core/mock/content.mock';

describe('LandingPage', () => {
  let component: LandingPage;
  let fixture: ComponentFixture<LandingPage>;
  let contentServiceMock: any;

  beforeEach(async () => {
    contentServiceMock = {
      getPlatformStats: jasmine.createSpy('getPlatformStats').and.returnValue(of(PLATFORM_STATS_MOCK)),
      getFeaturedInstructor: jasmine.createSpy('getFeaturedInstructor').and.returnValue(of(INSTRUCTOR_MOCK)),
      getTestimonials: jasmine.createSpy('getTestimonials').and.returnValue(of(TESTIMONIALS_MOCK)),
      getIntroductoryVideo: jasmine.createSpy('getIntroductoryVideo').and.returnValue(of({
        slug: 'intro',
        videoUrl: 'https://example.com/intro.mp4',
        title: { en: 'Intro Video', ar: 'الفيديو التعريفي' },
        isActive: true,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        { provide: ContentService, useValue: contentServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    component = fixture.componentInstance;
  });

  it('should create LandingPage', () => {
    expect(component).toBeTruthy();
  });

  it('should render hero section and stats', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')).toBeTruthy();
  });
});
