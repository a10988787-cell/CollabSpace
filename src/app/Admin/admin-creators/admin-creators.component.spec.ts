import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCreatorsComponent } from './admin-creators.component';

describe('AdminCreatorsComponent', () => {
  let component: AdminCreatorsComponent;
  let fixture: ComponentFixture<AdminCreatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCreatorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCreatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
