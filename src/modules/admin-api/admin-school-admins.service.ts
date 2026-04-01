import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { School } from '../../database/entities/school.entity';
import { UserRole } from '../../database/enums';
import {
  CreateSchoolAdminDto,
  ListSchoolAdminsQueryDto,
  PatchSchoolAdminDto,
} from './dto/admin-school-admins.dto';

export type SchoolAdminRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string | null;
  iin: string;
  role: typeof UserRole.SCHOOL_ADMIN;
  schoolId: string;
  school: {
    id: string;
    name: string;
    number: number | null;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminSchoolAdminsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
  ) {}

  private row(u: User): SchoolAdminRow {
    const s = u.school;
    if (!s) {
      throw new Error('SchoolAdminRow: school relation missing');
    }
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      patronymic: u.patronymic,
      iin: u.iin,
      role: UserRole.SCHOOL_ADMIN,
      schoolId: u.schoolId!,
      school: {
        id: s.id,
        name: s.name,
        number: s.number,
      },
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private async assertSchool(id: string): Promise<School> {
    const s = await this.schools.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Школа не найдена');
    return s;
  }

  async listSchoolAdmins(q: ListSchoolAdminsQueryDto) {
    await this.assertSchool(q.schoolId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.users
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.school', 's')
      .where('u.role = :role', { role: UserRole.SCHOOL_ADMIN })
      .andWhere('u.school_id = :sid', { sid: q.schoolId })
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id', 'ASC');
    if (q.search?.trim()) {
      const p = `%${q.search.trim()}%`;
      qb.andWhere(
        '(u.email ILIKE :p OR u.first_name ILIKE :p OR u.last_name ILIKE :p OR u.patronymic ILIKE :p)',
        { p },
      );
    }
    if (q.isActive !== undefined) {
      qb.andWhere('u.is_active = :a', { a: q.isActive });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((u) => this.row(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSchoolAdmin(id: string): Promise<SchoolAdminRow> {
    const u = await this.users.findOne({
      where: { id, role: UserRole.SCHOOL_ADMIN },
      relations: { school: true },
    });
    if (!u || !u.school) {
      throw new NotFoundException('Школьный администратор не найден');
    }
    return this.row(u);
  }

  async createSchoolAdmin(dto: CreateSchoolAdminDto): Promise<SchoolAdminRow> {
    await this.assertSchool(dto.schoolId);
    const email = dto.email.trim().toLowerCase();
    const dupEmail = await this.users.exist({ where: { email } });
    if (dupEmail) {
      throw new ConflictException('Пользователь с таким email уже есть');
    }
    const dupIin = await this.users.exist({ where: { iin: dto.iin } });
    if (dupIin) {
      throw new ConflictException('Пользователь с таким ИИН уже есть');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const u = this.users.create({
      schoolId: dto.schoolId,
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      patronymic: dto.patronymic?.trim() || null,
      iin: dto.iin,
      role: UserRole.SCHOOL_ADMIN,
      isActive: true,
    });
    await this.users.save(u);
    const full = await this.users.findOne({
      where: { id: u.id },
      relations: { school: true },
    });
    return this.row(full!);
  }

  async patchSchoolAdmin(
    id: string,
    dto: PatchSchoolAdminDto,
  ): Promise<SchoolAdminRow> {
    const u = await this.users.findOne({
      where: { id, role: UserRole.SCHOOL_ADMIN },
      relations: { school: true },
    });
    if (!u || !u.school) {
      throw new NotFoundException('Школьный администратор не найден');
    }
    if (dto.schoolId !== undefined && dto.schoolId !== u.schoolId) {
      await this.assertSchool(dto.schoolId);
      u.schoolId = dto.schoolId;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const other = await this.users.findOne({ where: { email } });
      if (other && other.id !== id) {
        throw new ConflictException('Пользователь с таким email уже есть');
      }
      u.email = email;
    }
    if (dto.password !== undefined) {
      u.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.firstName !== undefined) u.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) u.lastName = dto.lastName.trim();
    if (dto.patronymic !== undefined) {
      u.patronymic =
        dto.patronymic === null ? null : dto.patronymic.trim() || null;
    }
    if (dto.iin !== undefined) {
      const taken = await this.users.findOne({ where: { iin: dto.iin } });
      if (taken && taken.id !== id) {
        throw new ConflictException('Пользователь с таким ИИН уже есть');
      }
      u.iin = dto.iin;
    }
    if (dto.isActive !== undefined) u.isActive = dto.isActive;
    await this.users.save(u);
    return this.getSchoolAdmin(id);
  }

  async deactivateSchoolAdmin(id: string): Promise<void> {
    const u = await this.users.findOne({
      where: { id, role: UserRole.SCHOOL_ADMIN },
    });
    if (!u) throw new NotFoundException('Школьный администратор не найден');
    u.isActive = false;
    await this.users.save(u);
  }
}
