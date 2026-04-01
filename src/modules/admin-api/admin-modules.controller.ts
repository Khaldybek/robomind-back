import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminModulesService } from './admin-modules.service';
import {
  CreateAdminModuleDto,
  CreateContentFromFileDto,
  CreateModuleContentDto,
  ListAdminModulesQueryDto,
  PatchAdminModuleDto,
  PatchModuleContentDto,
} from './dto/admin-modules.dto';

const maxBytesContentUpload =
  Math.max(
    (Number(process.env.UPLOAD_MAX_VIDEO_MB) || 512) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 25) * 1024 * 1024,
    (Number(process.env.UPLOAD_MAX_FILE_MB) || 100) * 1024 * 1024,
  ) + 1024 * 1024;

@Controller('admin/modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminModulesController {
  constructor(private readonly modules: AdminModulesService) {}

  @Get()
  list(@Query() q: ListAdminModulesQueryDto) {
    return this.modules.listModules(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAdminModuleDto) {
    return this.modules.createModule(dto);
  }

  @Get(':moduleId/contents')
  listContents(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.modules.listContents(moduleId);
  }

  /**
   * Создание блока с загрузкой файла на сервер (реальное фото/видео/файл, без внешнего URL).
   * `multipart/form-data`: поле `file` + `type` = image | video | file, опц. `title`, `order`, `content`.
   */
  @Post(':moduleId/contents/from-file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxBytesContentUpload },
    }),
  )
  createContentFromFile(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateContentFromFileDto,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Прикрепите файл в поле file');
    }
    return this.modules.createContentFromFile(moduleId, file, body.type, {
      title: body.title,
      order: body.order,
      content: body.content,
    });
  }

  @Post(':moduleId/contents')
  @HttpCode(HttpStatus.CREATED)
  createContent(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateModuleContentDto,
  ) {
    return this.modules.createContent(moduleId, dto);
  }

  /** Алиас к POST …/contents (как в старой доке) */
  @Post(':moduleId/content')
  @HttpCode(HttpStatus.CREATED)
  createContentAlias(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateModuleContentDto,
  ) {
    return this.modules.createContent(moduleId, dto);
  }

  @Patch(':moduleId/contents/:contentId')
  patchContent(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: PatchModuleContentDto,
  ) {
    return this.modules.patchContent(moduleId, contentId, dto);
  }

  @Delete(':moduleId/contents/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContent(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    await this.modules.deleteContent(moduleId, contentId);
  }

  @Get(':moduleId')
  getOne(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.modules.getModule(moduleId);
  }

  @Patch(':moduleId')
  patch(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: PatchAdminModuleDto,
  ) {
    return this.modules.patchModule(moduleId, dto);
  }

  @Delete(':moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    await this.modules.deleteModule(moduleId);
  }
}
