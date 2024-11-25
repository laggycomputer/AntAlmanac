import { ShortCourse, ShortCourseSchedule, User, RepeatingCustomEvent } from '@packages/antalmanac-types';

import { and, eq } from 'drizzle-orm';
import type { Database } from '$db/index';
import { schedules, users, accounts, coursesInSchedule, customEvents } from '$db/schema';

type DatabaseOrTransaction = Omit<Database, '$client'>;

export class RDS {
    /**
     * If a guest user with the specified name exists, return their ID, otherwise return null.
     */
    static async guestUserIdWithNameOrNull(db: DatabaseOrTransaction, name: string): Promise<string | null> {
        return db
            .select({ id: accounts.userId })
            .from(accounts)
            .where(and(eq(accounts.accountType, 'GUEST'), eq(accounts.providerAccountId, name)))
            .limit(1)
            .then((xs) => xs[0]?.id ?? null);
    }

    /**
     * Creates a guest user if they don't already exist.
     *
     * @param db Database or transaction object
     * @param name Guest user's name, to be used as providerAccountID and username
     * @returns The new/existing user's ID
     */
    static async createGuestUserOptional(db: DatabaseOrTransaction, name: string) {
        return db.transaction(async (tx) => {
            const maybeUserId = await RDS.guestUserIdWithNameOrNull(tx, name);

            return maybeUserId
                ? maybeUserId
                : tx
                      .insert(users)
                      .values({ name })
                      .returning({ id: users.id })
                      .then((users) => users[0].id);
        });
    }

    /**
     * Creates a new schedule if one with its name doesn't already exist
     * and replaces its courses and custom events with the ones provided.
     */
    static async upsertScheduleAndContents(db: DatabaseOrTransaction, userId: string, schedule: ShortCourseSchedule) {
        // Add schedule
        const dbSchedule = {
            userId,
            name: schedule.scheduleName,
            notes: schedule.scheduleNote,
            lastUpdated: new Date(),
        };

        const scheduleResult = await db
            .transaction((tx) =>
                tx
                    .insert(schedules)
                    .values(dbSchedule)
                    .onConflictDoUpdate({
                        target: [schedules.userId, schedules.name],
                        set: dbSchedule,
                    })
                    .returning({ id: schedules.id })
            )
            .catch((error) => {
                throw new Error(`Failed to insert schedule for ${userId} (${schedule.scheduleName}): ${error}`);
            });

        const scheduleId = scheduleResult[0].id;
        if (scheduleId === undefined) {
            throw new Error(`Failed to insert schedule for ${userId}`);
        }

        // Add courses and custom events
        await Promise.all([
            this.upsertCourses(db, scheduleId, schedule.courses).catch((error) => {
                throw new Error(`Failed to insert courses for ${schedule.scheduleName}: ${error}`);
            }),

            this.upsertCustomEvents(db, scheduleId, schedule.customEvents).catch((error) => {
                throw new Error(`Failed to insert custom events for ${schedule.scheduleName}: ${error}`);
            }),
        ]);

        return scheduleId;
    }

    /**
     * If the guest user with the username in the userData object doesn't already exist,
     * create a new guest user and populate their data. Otherwise, returns null.
     */
    static async insertGuestUserData(db: DatabaseOrTransaction, userData: User): Promise<string | null> {
        return db.transaction(async (tx) => {
            const userId = await RDS.guestUserIdWithNameOrNull(tx, userData.id);
            if (userId) return null;
            return RDS.upsertGuestUserData(db, userData);
        });
    }

    /**
     * Does the same thing as `insertGuestUserData`, but also updates the user's schedules and courses if they exist.
     *
     * @param db The Drizzle client or transaction object
     * @param userData The object of data containing the user's schedules and courses
     * @returns The user's ID
     */
    static async upsertGuestUserData(db: DatabaseOrTransaction, userData: User): Promise<string> {
        return db.transaction(async (tx) => {
            const userId = await this.createGuestUserOptional(tx, userData.id);

            if (userId === undefined) {
                throw new Error(`Failed to create guest user for ${userData.id}`);
            }

            // Add schedules and courses
            const schedulesPromises = userData.userData.schedules.map((schedule) =>
                this.upsertScheduleAndContents(tx, userId, schedule)
            );

            const scheduleIds = await Promise.all(schedulesPromises);

            // Update user's current schedule index
            const scheduleIndex = userData.userData.scheduleIndex;

            const currentScheduleId =
                scheduleIndex === undefined || scheduleIndex >= scheduleIds.length ? null : scheduleIds[scheduleIndex];

            if (currentScheduleId !== null) {
                await tx.update(users).set({ currentScheduleId: currentScheduleId }).where(eq(users.id, userId));
            }

            return userId;
        });
    }

    /**
     * Drops all courses in the schedule and re-add them,
     * deduplicating by section code and term.
     * */
    private static async upsertCourses(db: DatabaseOrTransaction, scheduleId: string, courses: ShortCourse[]) {
        await db.transaction((tx) => tx.delete(coursesInSchedule).where(eq(coursesInSchedule.scheduleId, scheduleId)));

        if (courses.length === 0) {
            return;
        }

        const coursesUnique: Set<string> = new Set();

        const dbCourses = courses.map((course) => ({
            scheduleId,
            sectionCode: parseInt(course.sectionCode),
            term: course.term,
            color: course.color,
            lastUpdated: new Date(),
        }));

        const dbCoursesUnique = dbCourses.filter((course) => {
            const key = `${course.sectionCode}-${course.term}`;
            if (coursesUnique.has(key)) {
                return false;
            }
            coursesUnique.add(key);
            return true;
        });

        await db.transaction((tx) => tx.insert(coursesInSchedule).values(dbCoursesUnique));
    }

    private static async upsertCustomEvents(
        db: DatabaseOrTransaction,
        scheduleId: string,
        repeatingCustomEvents: RepeatingCustomEvent[]
    ) {
        await db.transaction(
            async (tx) => await tx.delete(customEvents).where(eq(customEvents.scheduleId, scheduleId))
        );

        if (repeatingCustomEvents.length === 0) {
            return;
        }

        const dbCustomEvents = repeatingCustomEvents.map((event) => ({
            scheduleId,
            title: event.title,
            start: event.start,
            end: event.end,
            days: event.days.map((day) => (day ? '1' : '0')).join(''),
            color: event.color,
            building: event.building,
            lastUpdated: new Date(),
        }));

        await db.transaction(async (tx) => await tx.insert(customEvents).values(dbCustomEvents));
    }
}
