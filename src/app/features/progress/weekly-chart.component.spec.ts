import { ComponentFixture, TestBed } from '@angular/core';
import { WeeklyChartComponent } from './weekly-chart.component';

describe('WeeklyChartComponent', () => {
  let component: WeeklyChartComponent;
  let fixture: ComponentFixture<WeeklyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklyChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WeeklyChartComponent);
    component = fixture.componentInstance;
  });

  it('should calculate bar heights and highlight peak day', () => {
    fixture.componentRef.setInput('data', [
      { day: 'sat', minutes: 20 },
      { day: 'sun', minutes: 60 },
      { day: 'mon', minutes: 40 },
    ]);
    fixture.detectChanges();

    const bars = (component as any).bars();
    expect(bars.length).toBe(3);
    expect(bars[1].peak).toBeTrue();
    expect(bars[1].height).toBe(72);
  });
});
