import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCollabPostsComponent } from './admin-collab-posts.component';

describe('AdminCollabPostsComponent', () => {
  let component: AdminCollabPostsComponent;
  let fixture: ComponentFixture<AdminCollabPostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCollabPostsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCollabPostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
