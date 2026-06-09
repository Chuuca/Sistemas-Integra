import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpcomingServices } from './upcoming-services.component';

describe('UpcomingServices', () => {
  let component: UpcomingServices;
  let fixture: ComponentFixture<UpcomingServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpcomingServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
