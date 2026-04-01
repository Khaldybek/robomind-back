import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { CourseAccess } from '../../database/entities/course-access.entity';
import { DeviceAccessViolation } from '../../database/entities/device-access-violation.entity';
import { AdminNotification } from '../../database/entities/admin-notification.entity';
import { UserRole } from '../../database/enums';

@Injectable()
export class AdminSchoolStatsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CourseAccess)
    private readonly accesses: Repository<CourseAccess>,
    @InjectRepository(DeviceAccessViolation)
    private readonly violations: Repository<DeviceAccessViolation>,
    @InjectRepository(AdminNotification)
    private readonly notifications: Repository<AdminNotification>,
  ) {}

  async summary(schoolId: string | null, adminUserId: string) {
    if (!schoolId) {
      throw new ForbiddenException('У администратора школы не задан schoolId');
    }

    const [studentsTotal, studentsActive] = await Promise.all([
      this.users.count({
        where: { schoolId, role: UserRole.STUDENT },
      }),
      this.users.count({
        where: { schoolId, role: UserRole.STUDENT, isActive: true },
      }),
    ]);

    const activeCourseAccessRows = await this.accesses
      .createQueryBuilder('ca')
      .innerJoin('ca.user', 'u')
      .where('u.school_id = :sid', { sid: schoolId })
      .andWhere('u.role = :r', { r: UserRole.STUDENT })
      .andWhere('ca.revoked_at IS NULL')
      .getCount();

    const distinctCoursesWithAccess = await this.accesses
      .createQueryBuilder('ca')
      .select('COUNT(DISTINCT ca.course_id)', 'cnt')
      .innerJoin('ca.user', 'u')
      .where('u.school_id = :sid', { sid: schoolId })
      .andWhere('u.role = :r', { r: UserRole.STUDENT })
      .andWhere('ca.revoked_at IS NULL')
      .getRawOne<{ cnt: string }>();

    const deviceViolationsTotal = await this.violations
      .createQueryBuilder('v')
      .innerJoin('v.user', 'u')
      .where('u.school_id = :sid', { sid: schoolId })
      .getCount();

    const unreadNotifications = await this.notifications.count({
      where: { recipientUserId: adminUserId, readAt: IsNull() },
    });

    return {
      schoolId,
      students: {
        total: studentsTotal,
        active: studentsActive,
        inactive: studentsTotal - studentsActive,
      },
      courseAccess: {
        /** Активных записей доступа (строк в course_accesses) */
        activeRows: activeCourseAccessRows,
        /** Сколько разных курсов затронуто активным доступом учеников школы */
        coursesWithAccess: parseInt(distinctCoursesWithAccess?.cnt ?? '0', 10),
      },
      deviceViolationsTotal,
      unreadNotificationsForCurrentAdmin: unreadNotifications,
      generatedAt: new Date().toISOString(),
    };
  }
}
