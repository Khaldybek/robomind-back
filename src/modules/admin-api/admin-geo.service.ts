import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../../database/entities/city.entity';
import { District } from '../../database/entities/district.entity';
import { School } from '../../database/entities/school.entity';
import { User } from '../../database/entities/user.entity';
import {
  CreateCityDto,
  PatchCityDto,
  ListCitiesQueryDto,
  CreateDistrictDto,
  PatchDistrictDto,
  ListDistrictsQueryDto,
  CreateSchoolDto,
  PatchSchoolDto,
  ListSchoolsQueryDto,
} from './dto/admin-geo.dto';

@Injectable()
export class AdminGeoService {
  constructor(
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  private cityRow(c: City) {
    return {
      id: c.id,
      name: c.name,
      nameKz: c.nameKz,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private districtRow(d: District) {
    return {
      id: d.id,
      cityId: d.cityId,
      name: d.name,
      nameKz: d.nameKz,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private schoolRow(s: School) {
    return {
      id: s.id,
      districtId: s.districtId,
      name: s.name,
      number: s.number,
      address: s.address,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async listCities(q: ListCitiesQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.cities.createQueryBuilder('c').orderBy('c.name', 'ASC');
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      qb.andWhere('(c.name ILIKE :s OR c.name_kz ILIKE :s)', { s });
    }
    if (q.isActive !== undefined) {
      qb.andWhere('c.is_active = :a', { a: q.isActive });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((c) => this.cityRow(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCity(id: string) {
    const c = await this.cities.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Город не найден');
    return this.cityRow(c);
  }

  async createCity(dto: CreateCityDto) {
    const c = this.cities.create({
      name: dto.name.trim(),
      nameKz: dto.nameKz?.trim() || null,
      isActive: dto.isActive !== false,
    });
    await this.cities.save(c);
    return this.cityRow(c);
  }

  async patchCity(id: string, dto: PatchCityDto) {
    const c = await this.cities.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Город не найден');
    if (dto.name !== undefined) c.name = dto.name.trim();
    if (dto.nameKz !== undefined) c.nameKz = dto.nameKz?.trim() || null;
    if (dto.isActive !== undefined) c.isActive = dto.isActive;
    await this.cities.save(c);
    return this.cityRow(c);
  }

  async deleteCity(id: string) {
    const n = await this.districts.count({ where: { cityId: id } });
    if (n > 0) {
      throw new ConflictException(
        'Нельзя удалить город: сначала удалите или перенесите районы',
      );
    }
    const res = await this.cities.delete(id);
    if (!res.affected) throw new NotFoundException('Город не найден');
  }

  async listDistricts(q: ListDistrictsQueryDto) {
    const city = await this.cities.findOne({ where: { id: q.cityId } });
    if (!city) throw new BadRequestException('Город не найден');
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const qb = this.districts
      .createQueryBuilder('d')
      .where('d.city_id = :cid', { cid: q.cityId })
      .orderBy('d.name', 'ASC');
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      qb.andWhere('(d.name ILIKE :s OR d.name_kz ILIKE :s)', { s });
    }
    if (q.isActive !== undefined) {
      qb.andWhere('d.is_active = :a', { a: q.isActive });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((d) => this.districtRow(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDistrict(id: string) {
    const d = await this.districts.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Район не найден');
    return this.districtRow(d);
  }

  async createDistrict(dto: CreateDistrictDto) {
    const city = await this.cities.findOne({ where: { id: dto.cityId } });
    if (!city) throw new BadRequestException('Город не найден');
    const d = this.districts.create({
      cityId: dto.cityId,
      name: dto.name.trim(),
      nameKz: dto.nameKz?.trim() || null,
      isActive: dto.isActive !== false,
    });
    await this.districts.save(d);
    return this.districtRow(d);
  }

  async patchDistrict(id: string, dto: PatchDistrictDto) {
    const d = await this.districts.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Район не найден');
    if (dto.name !== undefined) d.name = dto.name.trim();
    if (dto.nameKz !== undefined) d.nameKz = dto.nameKz?.trim() || null;
    if (dto.isActive !== undefined) d.isActive = dto.isActive;
    await this.districts.save(d);
    return this.districtRow(d);
  }

  async deleteDistrict(id: string) {
    const n = await this.schools.count({ where: { districtId: id } });
    if (n > 0) {
      throw new ConflictException(
        'Нельзя удалить район: сначала удалите или перенесите школы',
      );
    }
    const res = await this.districts.delete(id);
    if (!res.affected) throw new NotFoundException('Район не найден');
  }

  async listSchools(q: ListSchoolsQueryDto) {
    const dist = await this.districts.findOne({ where: { id: q.districtId } });
    if (!dist) throw new BadRequestException('Район не найден');
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const qb = this.schools
      .createQueryBuilder('s')
      .where('s.district_id = :did', { did: q.districtId })
      .orderBy('s.name', 'ASC');
    if (q.search?.trim()) {
      qb.andWhere(
        '(s.name ILIKE :s OR CAST(s.number AS TEXT) ILIKE :s OR s.address ILIKE :s)',
        { s: `%${q.search.trim()}%` },
      );
    }
    if (q.isActive !== undefined) {
      qb.andWhere('s.is_active = :a', { a: q.isActive });
    }
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: items.map((s) => this.schoolRow(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSchool(id: string) {
    const s = await this.schools.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Школа не найдена');
    return this.schoolRow(s);
  }

  async createSchool(dto: CreateSchoolDto) {
    const dist = await this.districts.findOne({ where: { id: dto.districtId } });
    if (!dist) throw new BadRequestException('Район не найден');
    const s = this.schools.create({
      districtId: dto.districtId,
      name: dto.name.trim(),
      number: dto.number ?? null,
      address: dto.address?.trim() || null,
      isActive: dto.isActive !== false,
    });
    await this.schools.save(s);
    return this.schoolRow(s);
  }

  async patchSchool(id: string, dto: PatchSchoolDto) {
    const s = await this.schools.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Школа не найдена');
    if (dto.name !== undefined) s.name = dto.name.trim();
    if (dto.number !== undefined) s.number = dto.number;
    if (dto.address !== undefined) s.address = dto.address?.trim() || null;
    if (dto.isActive !== undefined) s.isActive = dto.isActive;
    await this.schools.save(s);
    return this.schoolRow(s);
  }

  async deleteSchool(id: string) {
    const linked = await this.users.count({ where: { schoolId: id } });
    if (linked > 0) {
      throw new ConflictException(
        'Нельзя удалить школу: есть привязанные пользователи. Деактивируйте через PATCH isActive: false',
      );
    }
    const res = await this.schools.delete(id);
    if (!res.affected) throw new NotFoundException('Школа не найдена');
  }

  /** Профиль школы для админа школы (город → район → школа) */
  async getSchoolProfileForSchoolAdmin(schoolId: string) {
    const s = await this.schools.findOne({
      where: { id: schoolId },
      relations: { district: { city: true } },
    });
    if (!s) throw new NotFoundException('Школа не найдена');
    const d = s.district;
    const c = d?.city;
    return {
      school: this.schoolRow(s),
      district: d ? this.districtRow(d) : null,
      city: c ? this.cityRow(c) : null,
    };
  }
}
