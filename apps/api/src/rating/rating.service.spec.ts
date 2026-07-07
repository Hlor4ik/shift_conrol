import { Test, TestingModule } from '@nestjs/testing';
import { RatingService } from './rating.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

describe('RatingService', () => {
  let service: RatingService;
  const mockPrisma = {
    workerProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ratingHistory: { create: jest.fn() },
    shift: { findUnique: jest.fn() },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };
  const mockSettings = {
    getRatingRules: jest.fn().mockResolvedValue({
      ON_TIME: 2,
      LATE: -5,
      NO_SHOW: -30,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get(RatingService);
    jest.clearAllMocks();
  });

  it('should apply ON_TIME rule', async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue({ rating: 100, userId: 'w1' });
    mockPrisma.shift.findUnique.mockResolvedValue({ companyId: 'c1' });

    const result = await service.applyRule('w1', 'ON_TIME', 's1');
    expect(result && 'newRating' in result ? result.newRating : null).toBe(102);
  });

  it('should clamp rating to max 200', async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue({ rating: 199, userId: 'w1' });
    mockPrisma.shift.findUnique.mockResolvedValue(null);

    const result = await service.applyRule('w1', 'ON_TIME');
    expect(result && 'newRating' in result ? result.newRating : null).toBe(200);
  });
});
