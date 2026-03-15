import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorOverviewComponent } from './creator-overview.component';

describe('CreatorOverviewComponent', () => {
  let component: CreatorOverviewComponent;
  let fixture: ComponentFixture<CreatorOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
