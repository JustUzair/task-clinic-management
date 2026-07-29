import { PrismaPg } from "@prisma/adapter-pg";
import pino from "pino";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { PrismaClient } from "./generated/prisma/client.js";
import {
  AccountRole,
  AssignmentOrigin,
  AssignmentStatus,
  ImportSource,
  Profession,
} from "./generated/prisma/enums.js";
import type { AuthenticatedAccount } from "./modules/identity/identity.types.js";
import { ImportService } from "./modules/import/import.service.js";
import { NotificationService } from "./modules/notification/notification.service.js";
import { SseHub } from "./modules/realtime/sse-hub.js";
import { AssignmentService } from "./modules/scheduling/assignment.service.js";
import { ShiftService } from "./modules/scheduling/shift.service.js";

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://clinic_test:clinic_test@127.0.0.1:55432/clinic_test";
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const events = new SseHub(60_000, 3_000);
const notifications = new NotificationService(database);
const assignments = new AssignmentService(
  database,
  notifications,
  events,
);
const shifts = new ShiftService(
  database,
  notifications,
  events,
  "Asia/Kolkata",
);
const importer = new ImportService(
  database,
  { maxBytes: 100_000, maxRows: 1_000 },
  "Asia/Kolkata",
);

const databaseDescribe = runDatabaseTests ? describe.sequential : describe.skip;

async function clearDatabase(): Promise<void> {
  await database.notification.deleteMany();
  await database.assignment.deleteMany();
  await database.importRow.deleteMany();
  await database.importBatch.deleteMany();
  await database.shift.deleteMany();
  await database.staffProfile.deleteMany();
  await database.account.deleteMany();
}

async function createManager(): Promise<AuthenticatedAccount> {
  return database.account.create({
    data: {
      email: "manager@integration.test",
      fullName: "Integration Manager",
      role: AccountRole.MANAGER,
    },
    select: {
      email: true,
      fullName: true,
      id: true,
      role: true,
      staffProfile: {
        select: {
          id: true,
          profession: true,
          staffId: true,
        },
      },
    },
  });
}

async function createStaff(index: number, profession = Profession.NURSE) {
  return database.account.create({
    data: {
      email: `staff-${index}@integration.test`,
      fullName: `Integration Staff ${index}`,
      role: AccountRole.STAFF,
      staffProfile: {
        create: {
          profession,
          staffId: `integration-${index}`,
        },
      },
    },
    include: { staffProfile: true },
  });
}

async function createShift(
  startsAt: Date,
  endsAt: Date,
  nurseRequirement = 1,
) {
  return database.shift.create({
    data: {
      endsAt,
      requirements: {
        doctor: 0,
        nurse: nurseRequirement,
        receptionist: 0,
      },
      startsAt,
    },
  });
}

databaseDescribe("PostgreSQL scheduling and import invariants", () => {
  beforeEach(clearDatabase);
  afterAll(async () => {
    await clearDatabase();
    await database.$disconnect();
  });

  it("serializes concurrent claims so profession capacity cannot overfill", async () => {
    const manager = await createManager();
    const staff = await Promise.all(
      Array.from({ length: 4 }, (_, index) => createStaff(index)),
    );
    const shift = await createShift(
      new Date("2030-08-07T03:30:00.000Z"),
      new Date("2030-08-07T11:30:00.000Z"),
      2,
    );

    const results = await Promise.allSettled(
      staff.map(member =>
        assignments.managerAssign(
          shift.id,
          member.staffProfile!.id,
          manager,
        ),
      ),
    );

    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(
      2,
    );
    expect(results.filter(result => result.status === "rejected")).toHaveLength(
      2,
    );
    expect(
      await database.assignment.count({
        where: { shiftId: shift.id },
      }),
    ).toBe(2);
  });

  it("allows exactly one of two concurrent overlapping assignments", async () => {
    const manager = await createManager();
    const staff = await createStaff(1);
    const [firstShift, secondShift] = await Promise.all([
      createShift(
        new Date("2030-08-07T03:30:00.000Z"),
        new Date("2030-08-07T11:30:00.000Z"),
      ),
      createShift(
        new Date("2030-08-07T07:30:00.000Z"),
        new Date("2030-08-07T15:30:00.000Z"),
      ),
    ]);

    const results = await Promise.allSettled([
      assignments.managerAssign(
        firstShift.id,
        staff.staffProfile!.id,
        manager,
      ),
      assignments.managerAssign(
        secondShift.id,
        staff.staffProfile!.id,
        manager,
      ),
    ]);

    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter(result => result.status === "rejected")).toHaveLength(
      1,
    );
  });

  it("uses the exclusion constraint as a direct-write backstop while allowing adjacency", async () => {
    const manager = await createManager();
    const staff = await createStaff(1);
    const first = await createShift(
      new Date("2030-08-07T03:30:00.000Z"),
      new Date("2030-08-07T11:30:00.000Z"),
    );
    const overlapping = await createShift(
      new Date("2030-08-07T07:30:00.000Z"),
      new Date("2030-08-07T15:30:00.000Z"),
    );
    const adjacent = await createShift(
      new Date("2030-08-07T11:30:00.000Z"),
      new Date("2030-08-07T19:30:00.000Z"),
    );
    const common = {
      createdByAccountId: manager.id,
      origin: AssignmentOrigin.MANAGER_ASSIGNED,
      staffProfileId: staff.staffProfile!.id,
    };

    await database.assignment.create({
      data: {
        ...common,
        assignmentEndsAt: first.endsAt,
        assignmentStartsAt: first.startsAt,
        shiftId: first.id,
      },
    });
    await expect(
      database.assignment.create({
        data: {
          ...common,
          assignmentEndsAt: overlapping.endsAt,
          assignmentStartsAt: overlapping.startsAt,
          shiftId: overlapping.id,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      database.assignment.create({
        data: {
          ...common,
          assignmentEndsAt: adjacent.endsAt,
          assignmentStartsAt: adjacent.startsAt,
          shiftId: adjacent.id,
        },
      }),
    ).resolves.toBeDefined();
  });

  it("enforces assignment-origin removal rules and retains manager audit notices", async () => {
    const manager = await createManager();
    const staff = await createStaff(1);
    const staffActor: AuthenticatedAccount = {
      email: staff.email,
      fullName: staff.fullName,
      id: staff.id,
      role: staff.role,
      staffProfile: staff.staffProfile,
    };
    const selfClaimShift = await createShift(
      new Date("2030-08-07T03:30:00.000Z"),
      new Date("2030-08-07T11:30:00.000Z"),
    );
    const managerShift = await createShift(
      new Date("2030-08-08T03:30:00.000Z"),
      new Date("2030-08-08T11:30:00.000Z"),
    );

    const selfClaim = await assignments.selfClaim(
      selfClaimShift.id,
      staffActor,
    );
    await expect(
      assignments.remove(selfClaim.id, staffActor),
    ).resolves.toMatchObject({ status: AssignmentStatus.UNCLAIMED });

    const managerAssignment = await assignments.managerAssign(
      managerShift.id,
      staff.staffProfile!.id,
      manager,
    );
    const assignmentNotice = await database.notification.findUnique({
      where: {
        eventKey: `assignment:${managerAssignment.id}:manager-assigned`,
      },
      select: { messageData: true },
    });
    expect(assignmentNotice?.messageData).toEqual({
      assignmentId: managerAssignment.id,
      endsAt: "2030-08-08T11:30:00.000Z",
      shiftId: managerShift.id,
      startsAt: "2030-08-08T03:30:00.000Z",
    });
    await database.notification.update({
      where: {
        eventKey: `assignment:${managerAssignment.id}:manager-assigned`,
      },
      data: {
        messageData: {
          assignmentId: managerAssignment.id,
          shiftId: managerShift.id,
        },
      },
    });
    const listedNotifications = await notifications.listUnacknowledged(
      staff.id,
    );
    expect(
      listedNotifications.find(
        item => item.type === "MANAGER_ASSIGNED",
      )?.messageData,
    ).toEqual({
      assignmentId: managerAssignment.id,
      endsAt: "2030-08-08T11:30:00.000Z",
      shiftId: managerShift.id,
      startsAt: "2030-08-08T03:30:00.000Z",
    });
    await expect(
      assignments.remove(managerAssignment.id, staffActor),
    ).rejects.toMatchObject({ code: "MANAGER_ASSIGNMENT_LOCKED" });
    await expect(
      assignments.remove(managerAssignment.id, manager),
    ).resolves.toMatchObject({ status: AssignmentStatus.UNASSIGNED });
    expect(
      await database.notification.count({
        where: { recipientAccountId: staff.id },
      }),
    ).toBe(2);
  });

  it("retains cancelled shift details in the staff notification", async () => {
    const manager = await createManager();
    const staff = await createStaff(1);
    const shift = await database.shift.create({
      data: {
        endsAt: new Date("2030-08-07T11:30:00.000Z"),
        externalShiftId: "5017",
        requirements: {
          doctor: 0,
          nurse: 1,
          receptionist: 0,
        },
        startsAt: new Date("2030-08-07T03:30:00.000Z"),
      },
    });
    const assignment = await assignments.managerAssign(
      shift.id,
      staff.staffProfile!.id,
      manager,
    );

    await shifts.cancel(shift.id, manager.id);

    const notification = await database.notification.findUnique({
      where: {
        eventKey: `assignment:${assignment.id}:shift:CANCELLED`,
      },
      select: { messageData: true },
    });
    expect(notification?.messageData).toEqual({
      endsAt: "2030-08-07T11:30:00.000Z",
      externalShiftId: "5017",
      shiftId: shift.id,
      startsAt: "2030-08-07T03:30:00.000Z",
      status: "CANCELLED",
    });

    await database.notification.update({
      where: {
        eventKey: `assignment:${assignment.id}:shift:CANCELLED`,
      },
      data: {
        messageData: {
          shiftId: shift.id,
          status: "CANCELLED",
        },
      },
    });
    const listed = await notifications.listUnacknowledged(staff.id);
    expect(
      listed.find(item => item.type === "SHIFT_CANCELLED")?.messageData,
    ).toEqual({
      endsAt: "2030-08-07T11:30:00.000Z",
      externalShiftId: "5017",
      shiftId: shift.id,
      startsAt: "2030-08-07T03:30:00.000Z",
      status: "CANCELLED",
    });
  });

  it("atomically removes and notifies claims invalidated by a shift edit", async () => {
    const manager = await createManager();
    const staff = await createStaff(1);
    const first = await createShift(
      new Date("2030-08-07T03:30:00.000Z"),
      new Date("2030-08-07T07:30:00.000Z"),
    );
    const second = await createShift(
      new Date("2030-08-07T08:30:00.000Z"),
      new Date("2030-08-07T12:30:00.000Z"),
    );
    const firstAssignment = await assignments.managerAssign(
      first.id,
      staff.staffProfile!.id,
      manager,
    );
    await assignments.managerAssign(
      second.id,
      staff.staffProfile!.id,
      manager,
    );

    await shifts.update(
      first.id,
      {
        date: "2030-08-07",
        endTime: "15:00",
        requirements: { doctor: 0, nurse: 1, receptionist: 0 },
        startTime: "09:00",
      },
      manager.id,
    );

    expect(
      await database.assignment.findUnique({
        where: { id: firstAssignment.id },
        select: { endReason: true, status: true },
      }),
    ).toEqual({
      endReason: "SHIFT_EDIT_CREATED_OVERLAP",
      status: AssignmentStatus.CANCELLED,
    });
    expect(
      await database.notification.count({
        where: {
          eventKey: `assignment:${firstAssignment.id}:edit-removed`,
        },
      }),
    ).toBe(1);
  });

  it("rejects creating or editing a shift to a start time that has passed", async () => {
    const manager = await createManager();

    await expect(
      shifts.create(
        {
          date: "2000-01-01",
          endTime: "17:00",
          requirements: { doctor: 0, nurse: 1, receptionist: 0 },
          startTime: "09:00",
        },
        manager.id,
      ),
    ).rejects.toMatchObject({ code: "SHIFT_START_NOT_FUTURE" });

    const future = await createShift(
      new Date("2030-08-07T03:30:00.000Z"),
      new Date("2030-08-07T11:30:00.000Z"),
    );
    await expect(
      shifts.update(
        future.id,
        {
          date: "2000-01-01",
          endTime: "17:00",
          requirements: { doctor: 0, nurse: 1, receptionist: 0 },
          startTime: "09:00",
        },
        manager.id,
      ),
    ).rejects.toMatchObject({ code: "SHIFT_START_NOT_FUTURE" });
  });

  it("keeps mixed staff imports deterministic, evidenced, and non-overwriting", async () => {
    const content = [
      "staff_id,full_name,role,email",
      "101,Ben Ali,Nurse,ben@example.test",
      "101,Ben Ali,NURSE,ben@example.test",
      "101,Ben Ali,Doctor,ben@example.test",
    ].join("\n");

    const first = await importer.importStaff({
      content,
      filename: "staff.csv",
      source: ImportSource.UPLOAD,
    });
    const second = await importer.importStaff({
      content,
      filename: "staff.csv",
      source: ImportSource.UPLOAD,
    });

    expect(first).toMatchObject({
      acceptedRows: 1,
      mergedRows: 1,
      rejectedRows: 1,
      totalRows: 3,
    });
    expect(second).toMatchObject({
      acceptedRows: 0,
      mergedRows: 2,
      rejectedRows: 1,
      totalRows: 3,
    });
    expect(await database.staffProfile.count()).toBe(1);
    expect(
      await database.importRow.count({
        where: { batchId: first.batchId },
      }),
    ).toBe(3);
  });

  it("skips an already completed seed checksum", async () => {
    const content = [
      "staff_id,full_name,role,email",
      "101,Ben Ali,Nurse,ben@example.test",
    ].join("\n");
    const input = {
      content,
      filename: "staff.csv",
      source: ImportSource.SEED,
    } as const;

    const first = await importer.importStaff(input);
    const repeated = await importer.importStaff(input);

    expect(repeated.batchId).toBe(first.batchId);
    expect(await database.importBatch.count()).toBe(1);
    expect(await database.staffProfile.count()).toBe(1);
  });
});
