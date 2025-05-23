import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConflictModalComponent } from './conflict-modal.component';

describe('ConflictModalComponent', () => {
  let component: ConflictModalComponent;
  let fixture: ComponentFixture<ConflictModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConflictModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConflictModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
