import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AppStudentService } from './app-student.service';

/** Гео для регистрации и справочников (без авторизации) */
@Controller('app')
export class AppGeoController {
  constructor(private readonly app: AppStudentService) {}

  @Get('cities')
  listCities() {
    return this.app.listCities();
  }

  @Get('cities/:cityId/districts')
  listDistricts(@Param('cityId', ParseUUIDPipe) cityId: string) {
    return this.app.listDistricts(cityId);
  }

  @Get('districts/:districtId/schools')
  listSchools(@Param('districtId', ParseUUIDPipe) districtId: string) {
    return this.app.listSchools(districtId);
  }
}
