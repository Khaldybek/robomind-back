import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
import { AdminCertificatesService } from './admin-certificates.service';
import {
  CreateAdminCertificateDto,
  ListAdminCertificatesQueryDto,
} from './dto/admin-certificates.dto';

@Controller('admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminCertificatesController {
  constructor(private readonly certs: AdminCertificatesService) {}

  @Get()
  list(@Query() q: ListAdminCertificatesQueryDto) {
    return this.certs.listCertificates(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAdminCertificateDto) {
    return this.certs.createCertificate(dto);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.certs.getCertificate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.certs.deleteCertificate(id);
  }
}
