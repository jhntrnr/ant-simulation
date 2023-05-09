import { TestBed } from '@angular/core/testing';

import { PredatorService } from './predator.service';

describe('PredatorService', () => {
  let service: PredatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
