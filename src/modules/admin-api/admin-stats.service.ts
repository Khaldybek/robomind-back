import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { Certificate } from '../../database/entities/certificate.entity';
import { UserRole } from '../../database/enums';

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
  ) {}

  async summary() {
    const [
      usersTotal,
      students,
      schoolAdmins,
      superAdmins,
      schoolsActive,
      schoolsTotal,
      coursesPublished,
      coursesTotal,
      certificatesTotal,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { role: UserRole.STUDENT } }),
      this.users.count({ where: { role: UserRole.SCHOOL_ADMIN } }),
      this.users.count({ where: { role: UserRole.SUPER_ADMIN } }),
      this.schools.count({ where: { isActive: true } }),
      this.schools.count(),
      this.courses.count({ where: { isPublished: true } }),
      this.courses.count(),
      this.certificates.count(),
    ]);
    return {
      users: {
        total: usersTotal,
        students,
        schoolAdmins,
        superAdmins,
      },
      schools: { total: schoolsTotal, active: schoolsActive },
      courses: { total: coursesTotal, published: coursesPublished },
      certificates: { total: certificatesTotal },
      generatedAt: new Date().toISOString(),
    };
  }
}
