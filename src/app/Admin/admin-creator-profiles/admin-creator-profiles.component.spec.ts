import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCreatorProfilesComponent } from './admin-creator-profiles.component';

describe('AdminCreatorProfilesComponent', () => {
  let component: AdminCreatorProfilesComponent;
  let fixture: ComponentFixture<AdminCreatorProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCreatorProfilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCreatorProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
