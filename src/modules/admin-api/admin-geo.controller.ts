import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminGeoService } from './admin-geo.service';
import { AdminSchoolAdminsService } from './admin-school-admins.service';
import { ListSchoolAdminsBySchoolQueryDto } from './dto/admin-school-admins.dto';
import {
  ListCitiesQueryDto,
  CreateCityDto,
  PatchCityDto,
  ListDistrictsQueryDto,
  CreateDistrictDto,
  PatchDistrictDto,
  ListSchoolsQueryDto,
  CreateSchoolDto,
  PatchSchoolDto,
} from './dto/admin-geo.dto';

/** Гео и школы — только super_admin */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminGeoController {
  constructor(
    private readonly geo: AdminGeoService,
    private readonly schoolAdmins: AdminSchoolAdminsService,
  ) {}

  // --- Cities ---
  @Get('cities')
  listCities(@Query() q: ListCitiesQueryDto) {
    return this.geo.listCities(q);
  }

  @Get('cities/:id')
  getCity(@Param('id', ParseUUIDPipe) id: string) {
    return this.geo.getCity(id);
  }

  @Post('cities')
  @HttpCode(HttpStatus.CREATED)
  createCity(@Body() dto: CreateCityDto) {
    return this.geo.createCity(dto);
  }

  @Patch('cities/:id')
  patchCity(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchCityDto) {
    return this.geo.patchCity(id, dto);
  }

  @Delete('cities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCity(@Param('id', ParseUUIDPipe) id: string) {
    await this.geo.deleteCity(id);
  }

  // --- Districts ---
  @Get('districts')
  listDistricts(@Query() q: ListDistrictsQueryDto) {
    return this.geo.listDistricts(q);
  }

  @Get('districts/:id')
  getDistrict(@Param('id', ParseUUIDPipe) id: string) {
    return this.geo.getDistrict(id);
  }

  @Post('districts')
  @HttpCode(HttpStatus.CREATED)
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.geo.createDistrict(dto);
  }

  @Patch('districts/:id')
  patchDistrict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchDistrictDto,
  ) {
    return this.geo.patchDistrict(id, dto);
  }

  @Delete('districts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDistrict(@Param('id', ParseUUIDPipe) id: string) {
    await this.geo.deleteDistrict(id);
  }

  // --- Schools ---
  @Get('schools')
  listSchools(@Query() q: ListSchoolsQueryDto) {
    return this.geo.listSchools(q);
  }

  /** Школьные админы по школе (тот же ответ, что GET /admin/school-admins?schoolId=) */
  @Get('schools/:schoolId/admins')
  listSchoolAdminsBySchool(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() q: ListSchoolAdminsBySchoolQueryDto,
  ) {
    return this.schoolAdmins.listSchoolAdmins({
      schoolId,
      page: q.page,
      limit: q.limit,
      search: q.search,
      isActive: q.isActive,
    });
  }

  @Get('schools/:id')
  getSchool(@Param('id', ParseUUIDPipe) id: string) {
    return this.geo.getSchool(id);
  }

  @Post('schools')
  @HttpCode(HttpStatus.CREATED)
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.geo.createSchool(dto);
  }

  @Patch('schools/:id')
  patchSchool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchSchoolDto,
  ) {
    return this.geo.patchSchool(id, dto);
  }

  @Delete('schools/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchool(@Param('id', ParseUUIDPipe) id: string) {
    await this.geo.deleteSchool(id);
  }
}
