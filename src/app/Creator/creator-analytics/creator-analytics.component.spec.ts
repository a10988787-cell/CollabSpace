import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorAnalyticsComponent } from './creator-analytics.component';

describe('CreatorAnalyticsComponent', () => {
  let component: CreatorAnalyticsComponent;
  let fixture: ComponentFixture<CreatorAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
