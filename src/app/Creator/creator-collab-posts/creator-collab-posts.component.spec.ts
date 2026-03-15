import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorCollabPostsComponent } from './creator-collab-posts.component';

describe('CreatorCollabPostsComponent', () => {
  let component: CreatorCollabPostsComponent;
  let fixture: ComponentFixture<CreatorCollabPostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorCollabPostsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorCollabPostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
