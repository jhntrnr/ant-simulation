import { TestBed } from '@angular/core/testing';

import { AntService } from './ant.service';

describe('AntService', () => {
  let service: AntService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AntService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
