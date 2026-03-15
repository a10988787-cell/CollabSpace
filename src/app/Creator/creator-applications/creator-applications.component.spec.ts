import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorApplicationsComponent } from './creator-applications.component';

describe('CreatorApplicationsComponent', () => {
  let component: CreatorApplicationsComponent;
  let fixture: ComponentFixture<CreatorApplicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorApplicationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
