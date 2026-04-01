import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../database/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminQuizService } from './admin-quiz.service';
import {
  ApplyGeneratedQuizDto,
  CreateAdminQuizDto,
  CreateAdminQuestionDto,
  CreateAdminAnswerDto,
  PatchAdminQuizDto,
  PatchAdminQuestionDto,
  PatchAdminAnswerDto,
} from './dto/admin-quiz.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminQuizController {
  constructor(private readonly quiz: AdminQuizService) {}

  @Get('modules/:moduleId/quiz')
  getByModule(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.quiz.getQuizByModule(moduleId);
  }

  /** Импорт вопросов из ИИ (тело как ответ POST /admin/ai/quiz/generate) */
  @Post('modules/:moduleId/quiz/import-generated')
  importGenerated(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: ApplyGeneratedQuizDto,
  ) {
    return this.quiz.importGeneratedQuestions(moduleId, dto);
  }

  @Post('modules/:moduleId/quiz')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateAdminQuizDto,
  ) {
    return this.quiz.createQuiz(moduleId, dto);
  }

  @Post('quizzes/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  createQuestion(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateAdminQuestionDto,
  ) {
    return this.quiz.createQuestion(quizId, dto);
  }

  @Patch('quizzes/:quizId')
  patchQuiz(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: PatchAdminQuizDto,
  ) {
    return this.quiz.patchQuiz(quizId, dto);
  }

  @Delete('quizzes/:quizId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuiz(@Param('quizId', ParseUUIDPipe) quizId: string) {
    await this.quiz.deleteQuiz(quizId);
  }

  @Patch('questions/:questionId')
  patchQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: PatchAdminQuestionDto,
  ) {
    return this.quiz.patchQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.quiz.deleteQuestion(questionId);
  }

  @Post('questions/:questionId/answers')
  @HttpCode(HttpStatus.CREATED)
  createAnswer(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: CreateAdminAnswerDto,
  ) {
    return this.quiz.createAnswer(questionId, dto);
  }

  @Patch('answers/:answerId')
  patchAnswer(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() dto: PatchAdminAnswerDto,
  ) {
    return this.quiz.patchAnswer(answerId, dto);
  }

  @Delete('answers/:answerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnswer(@Param('answerId', ParseUUIDPipe) answerId: string) {
    await this.quiz.deleteAnswer(answerId);
  }
}
