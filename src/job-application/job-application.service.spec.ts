import { BadRequestException } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';

describe('JobApplicationService transition policy', () => {
  const service = new JobApplicationService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it.each([
    ['pending', 'accepted'],
    ['pending', 'rejected'],
    ['rejected', 'pending'],
    ['accepted', 'completed'],
  ])('allows %s -> %s', (current, next) => {
    expect(() =>
      (service as any).assertEmployerTransition(current, next),
    ).not.toThrow();
  });

  it.each([
    ['pending', 'completed'],
    ['accepted', 'rejected'],
    ['completed', 'pending'],
    ['withdrawn', 'accepted'],
  ])('rejects %s -> %s', (current, next) => {
    expect(() =>
      (service as any).assertEmployerTransition(current, next),
    ).toThrow(BadRequestException);
  });
});
