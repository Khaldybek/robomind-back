import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiDailyUsage } from '../../database/entities/ai-daily-usage.entity';
import { AiFeature } from '../../database/enums';

@Injectable()
export class AiQuotaService {
  constructor(
    @InjectRepository(AiDailyUsage)
    private readonly usageRepo: Repository<AiDailyUsage>,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async assertUnderLimit(
    userId: string,
    feature: AiFeature,
    dailyLimit: number,
  ): Promise<void> {
    if (dailyLimit <= 0) return;
    const usageDate = this.today();
    const rows = await this.usageRepo.query(
      `SELECT count FROM ai_daily_usage
       WHERE user_id = $1 AND feature = $2 AND usage_date = $3::date`,
      [userId, feature, usageDate],
    );
    const count = rows[0]?.count ?? 0;
    if (count >= dailyLimit) {
      throw new HttpException(
        { message: 'Дневной лимит запросов к ИИ исчерпан', feature },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async increment(userId: string, feature: AiFeature): Promise<void> {
    const usageDate = this.today();
    await this.usageRepo.query(
      `INSERT INTO ai_daily_usage (id, user_id, feature, usage_date, count, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3::date, 1, now(), now())
       ON CONFLICT (user_id, feature, usage_date)
       DO UPDATE SET count = ai_daily_usage.count + 1, updated_at = now()`,
      [userId, feature, usageDate],
    );
  }
}
