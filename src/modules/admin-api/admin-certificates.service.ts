import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Certificate } from '../../database/entities/certificate.entity';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { UserRole } from '../../database/enums';
import {
  CreateAdminCertificateDto,
  ListAdminCertificatesQueryDto,
} from './dto/admin-certificates.dto';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class AdminCertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certs: Repository<Certificate>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    private readonly gamification: GamificationService,
  ) {}

  private genUniqueCode(): string {
    return `${Date.now().toString(36)}-${randomBytes(10).toString('hex')}`;
  }

  async listCertificates(q: ListAdminCertificatesQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.certs
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .leftJoinAndSelect('c.course', 'co')
      .orderBy('c.issuedAt', 'DESC')
      .addOrderBy('c.id', 'ASC');
    if (q.userId) qb.andWhere('c.user_id = :uid', { uid: q.userId });
    if (q.courseId) qb.andWhere('c.course_id = :cid', { cid: q.courseId });
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((c) => this.row(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private row(c: Certificate) {
    return {
      id: c.id,
      userId: c.userId,
      courseId: c.courseId,
      issuedAt: c.issuedAt,
      pdfUrl: c.pdfUrl,
      uniqueCode: c.uniqueCode,
      createdAt: c.createdAt,
      user: c.user
        ? {
            id: c.user.id,
            email: c.user.email,
            firstName: c.user.firstName,
            lastName: c.user.lastName,
          }
        : undefined,
      course: c.course ? { id: c.course.id, title: c.course.title } : undefined,
    };
  }

  async getCertificate(id: string) {
    const c = await this.certs.findOne({
      where: { id },
      relations: { user: true, course: true },
    });
    if (!c) throw new NotFoundException('Сертификат не найден');
    return this.row(c);
  }

  async createCertificate(dto: CreateAdminCertificateDto) {
    const u = await this.users.findOne({ where: { id: dto.userId } });
    if (!u || u.role !== UserRole.STUDENT) {
      throw new ConflictException('Сертификат выдаётся только ученикам');
    }
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Курс не найден');
    const dup = await this.certs.exist({
      where: { userId: dto.userId, courseId: dto.courseId },
    });
    if (dup) {
      throw new ConflictException(
        'У ученика уже есть сертификат по этому курсу',
      );
    }
    let code = this.genUniqueCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.certs.exist({ where: { uniqueCode: code } });
      if (!exists) break;
      code = this.genUniqueCode();
    }
    const c = this.certs.create({
      userId: dto.userId,
      courseId: dto.courseId,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
      pdfUrl: dto.pdfUrl?.trim() || null,
      uniqueCode: code,
    });
    await this.certs.save(c);

    // Fire-and-forget: начислить XP и проверить бейджи за завершение курса
    void this.gamification
      .processEvent(dto.userId, { type: 'course_completed' })
      .catch(() => undefined);

    return this.getCertificate(c.id);
  }

  async deleteCertificate(id: string): Promise<void> {
    const c = await this.certs.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Сертификат не найден');
    await this.certs.remove(c);
  }
}
