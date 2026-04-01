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
import { AdminSchoolAdminsService } from './admin-school-admins.service';
import {
  CreateSchoolAdminDto,
  ListSchoolAdminsQueryDto,
  PatchSchoolAdminDto,
} from './dto/admin-school-admins.dto';

@Controller('admin/school-admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminSchoolAdminsController {
  constructor(private readonly schoolAdmins: AdminSchoolAdminsService) {}

  @Get()
  list(@Query() q: ListSchoolAdminsQueryDto) {
    return this.schoolAdmins.listSchoolAdmins(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSchoolAdminDto) {
    return this.schoolAdmins.createSchoolAdmin(dto);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolAdmins.getSchoolAdmin(id);
  }

  @Patch(':id')
  patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchSchoolAdminDto,
  ) {
    return this.schoolAdmins.patchSchoolAdmin(id, dto);
  }

  /** Мягкое отключение (isActive = false) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.schoolAdmins.deactivateSchoolAdmin(id);
  }
}
