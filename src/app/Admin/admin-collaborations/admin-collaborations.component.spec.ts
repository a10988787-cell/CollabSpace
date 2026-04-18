import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCollaborationsComponent } from './admin-collaborations.component';

describe('AdminCollaborationsComponent', () => {
  let component: AdminCollaborationsComponent;
  let fixture: ComponentFixture<AdminCollaborationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCollaborationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCollaborationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
