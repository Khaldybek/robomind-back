import {
  Controller,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppStudentService } from './app-student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/enums';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';

@Controller('app')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class AppQuizController {
  constructor(private readonly app: AppStudentService) {}

  @Post('quizzes/:quizId/attempt')
  @HttpCode(HttpStatus.CREATED)
  startAttempt(
    @CurrentUser('id') userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ) {
    return this.app.startQuizAttempt(userId, quizId);
  }

  @Post('attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  submitAttempt(
    @CurrentUser('id') userId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() body: SubmitQuizAttemptDto,
  ) {
    return this.app.submitQuizAttempt(userId, attemptId, body);
  }
}
