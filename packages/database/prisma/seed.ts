import { PrismaClient, UserRole, UserStatus, ShiftStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_RATING_RULES = {
  ON_TIME: 2,
  GOOD_RATING: 3,
  BEST_WORKER: 5,
  LATE: -5,
  CANCEL_LESS_24H: -10,
  NO_SHOW: -30,
  BAD_RATING: -10,
};

async function main() {
  const superadminEmail = process.env.SUPERADMIN_EMAIL ?? 'admin@shiftcontrol.local';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD ?? 'Admin123!@#';
  const passwordHash = await bcrypt.hash(superadminPassword, 12);

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      email: superadminEmail,
      passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const company = await prisma.company.upsert({
    where: { id: 'seed-company-1' },
    update: {},
    create: {
      id: 'seed-company-1',
      name: 'Демо Строй',
      inn: '7700000000',
      phone: '+79001234567',
      email: 'demo@stroy.local',
      address: 'Москва, ул. Строителей, 1',
      isActive: true,
    },
  });

  const managerEmail = 'manager@shiftcontrol.local';
  const managerHash = await bcrypt.hash('Manager123!@#', 12);
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {},
    create: {
      email: managerEmail,
      passwordHash: managerHash,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      companyId: company.id,
      managerProfile: {
        create: {
          companyId: company.id,
          fullName: 'Иван Менеджеров',
          phone: '+79001112233',
        },
      },
    },
  });

  const foremanEmail = 'foreman@shiftcontrol.local';
  const foremanHash = await bcrypt.hash('Foreman123!@#', 12);
  const foreman = await prisma.user.upsert({
    where: { email: foremanEmail },
    update: {},
    create: {
      email: foremanEmail,
      passwordHash: foremanHash,
      role: UserRole.FOREMAN,
      status: UserStatus.ACTIVE,
      companyId: company.id,
      foremanProfile: {
        create: {
          companyId: company.id,
          fullName: 'Пётр Бригадиров',
          phone: '+79004445566',
        },
      },
    },
  });

  const object = await prisma.constructionObject.upsert({
    where: { id: 'seed-object-1' },
    update: {},
    create: {
      id: 'seed-object-1',
      companyId: company.id,
      name: 'ЖК Солнечный',
      address: 'Москва, ул. Солнечная, 15',
      latitude: 55.751244,
      longitude: 37.618423,
      description: 'Строительство жилого комплекса',
      isActive: true,
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await prisma.shift.upsert({
    where: { id: 'seed-shift-1' },
    update: {},
    create: {
      id: 'seed-shift-1',
      companyId: company.id,
      objectId: object.id,
      title: 'Монтажные работы',
      address: object.address,
      latitude: object.latitude,
      longitude: object.longitude,
      date: tomorrow,
      startTime: '08:00',
      endTime: '17:00',
      duration: 540,
      cost: 3500,
      maxWorkers: 10,
      bookedWorkers: 0,
      description: 'Монтаж металлоконструкций на 3 этаже',
      requirements: 'Каска, перчатки, спецобувь',
      minRating: 50,
      foremanId: foreman.id,
      status: ShiftStatus.PUBLISHED,
      qrCheckInToken: 'seed-qr-token-1',
      gpsRadiusMeters: 200,
    },
  });

  await prisma.setting.upsert({
    where: { id: 'global-rating-rules' },
    update: { value: DEFAULT_RATING_RULES },
    create: {
      id: 'global-rating-rules',
      companyId: null,
      key: 'rating_rules',
      value: DEFAULT_RATING_RULES,
    },
  });

  await prisma.setting.upsert({
    where: { id: `company-rating-rules-${company.id}` },
    update: { value: DEFAULT_RATING_RULES },
    create: {
      id: `company-rating-rules-${company.id}`,
      companyId: company.id,
      key: 'rating_rules',
      value: DEFAULT_RATING_RULES,
    },
  });

  await prisma.setting.upsert({
    where: { id: 'global-gps-radius' },
    update: { value: 200 },
    create: {
      id: 'global-gps-radius',
      companyId: null,
      key: 'gps_default_radius_meters',
      value: 200,
    },
  });

  console.log('Seed completed:', {
    superadmin: superadmin.email,
    manager: manager.email,
    foreman: foreman.email,
    company: company.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
