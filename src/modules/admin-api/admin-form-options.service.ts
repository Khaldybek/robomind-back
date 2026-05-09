import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../../database/entities/school.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseModule } from '../../database/entities/course-module.entity';
import { Lesson } from '../../database/entities/lesson.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import {
  FormOptionsSchoolsQueryDto,
  FormOptionsCoursesQueryDto,
  FormOptionsCourseModulesQueryDto,
  FormOptionsLessonsQueryDto,
  FormOptionsQuizzesQueryDto,
} from './dto/admin-form-options.dto';

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class AdminFormOptionsService {
  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly courseModules: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
  ) {}

  async listSchools(q: FormOptionsSchoolsQueryDto): Promise<
    Paginated<{
      id: string;
      name: string;
      number: number | null;
      districtId: string;
      districtName: string;
      isActive: boolean;
    }>
  > {
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const qb = this.schools
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.district', 'd');
    if (q.isActive !== false) {
      qb.andWhere('s.is_active = true');
    }
    if (q.search?.trim()) {
      qb.andWhere('s.name ILIKE :s', { s: `%${q.search.trim()}%` });
    }
    qb.orderBy('s.name', 'ASC').addOrderBy('s.id', 'ASC');
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items = rows.map((s) => ({
      id: s.id,
      name: s.name,
      number: s.number,
      districtId: s.districtId,
      districtName: s.district?.name ?? '',
      isActive: s.isActive,
    }));
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listCourses(q: FormOptionsCoursesQueryDto): Promise<
    Paginated<{
      id: string;
      title: string;
      order: number;
      isPublished: boolean;
    }>
  > {
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const qb = this.courses.createQueryBuilder('c');
    if (q.isPublished !== undefined) {
      qb.andWhere('c.is_published = :pub', { pub: q.isPublished });
    }
    if (q.search?.trim()) {
      qb.andWhere('c.title ILIKE :s', { s: `%${q.search.trim()}%` });
    }
    qb.orderBy('c.order', 'ASC').addOrderBy('c.title', 'ASC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return {
      items: list.map((c) => ({
        id: c.id,
        title: c.title,
        order: c.order,
        isPublished: c.isPublished,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listCourseModules(
    q: FormOptionsCourseModulesQueryDto,
  ): Promise<
    Paginated<{
      id: string;
      courseId: string;
      courseTitle: string;
      title: string;
      order: number;
      isPublished: boolean;
    }>
  > {
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const qb = this.courseModules
      .createQueryBuilder('cm')
      .innerJoinAndSelect('cm.course', 'course');
    if (q.courseId) {
      qb.andWhere('cm.course_id = :cid', { cid: q.courseId });
    }
    if (q.search?.trim()) {
      qb.andWhere(
        '(cm.title ILIKE :s OR course.title ILIKE :s)',
        { s: `%${q.search.trim()}%` },
      );
    }
    qb.orderBy('course.order', 'ASC')
      .addOrderBy('cm.order', 'ASC')
      .addOrderBy('cm.title', 'ASC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items = list.map((cm) => ({
      id: cm.id,
      courseId: cm.courseId,
      courseTitle: cm.course?.title ?? '',
      title: cm.title,
      order: cm.order,
      isPublished: cm.isPublished,
    }));
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listLessons(q: FormOptionsLessonsQueryDto): Promise<
    Paginated<{
      id: string;
      courseModuleId: string;
      courseModuleTitle: string;
      courseId: string;
      courseTitle: string;
      title: string;
      order: number;
      isPublished: boolean;
    }>
  > {
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const qb = this.lessons
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.courseModule', 'cm')
      .innerJoinAndSelect('cm.course', 'course');
    if (q.courseModuleId) {
      qb.andWhere('l.course_module_id = :cmid', { cmid: q.courseModuleId });
    }
    if (q.search?.trim()) {
      qb.andWhere(
        '(l.title ILIKE :s OR cm.title ILIKE :s OR course.title ILIKE :s)',
        { s: `%${q.search.trim()}%` },
      );
    }
    qb.orderBy('course.order', 'ASC')
      .addOrderBy('cm.order', 'ASC')
      .addOrderBy('l.order', 'ASC')
      .addOrderBy('l.title', 'ASC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items = list.map((l) => ({
      id: l.id,
      courseModuleId: l.courseModuleId,
      courseModuleTitle: l.courseModule?.title ?? '',
      courseId: l.courseModule?.courseId ?? '',
      courseTitle: l.courseModule?.course?.title ?? '',
      title: l.title,
      order: l.order,
      isPublished: l.isPublished,
    }));
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listQuizzes(q: FormOptionsQuizzesQueryDto): Promise<
    Paginated<{
      id: string;
      title: string;
      lessonId: string;
      lessonTitle: string;
      courseModuleId: string;
      courseModuleTitle: string;
      courseId: string;
      courseTitle: string;
    }>
  > {
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const qb = this.quizzes
      .createQueryBuilder('q')
      .innerJoinAndSelect('q.lesson', 'l')
      .innerJoinAndSelect('l.courseModule', 'cm')
      .innerJoinAndSelect('cm.course', 'course');
    if (q.search?.trim()) {
      qb.andWhere(
        '(q.title ILIKE :s OR l.title ILIKE :s OR course.title ILIKE :s)',
        { s: `%${q.search.trim()}%` },
      );
    }
    qb.orderBy('course.order', 'ASC')
      .addOrderBy('cm.order', 'ASC')
      .addOrderBy('l.order', 'ASC')
      .addOrderBy('q.title', 'ASC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items = list.map((qrow) => {
      const les = qrow.lesson;
      const cm = les?.courseModule;
      return {
        id: qrow.id,
        title: qrow.title,
        lessonId: qrow.lessonId,
        lessonTitle: les?.title ?? '',
        courseModuleId: cm?.id ?? '',
        courseModuleTitle: cm?.title ?? '',
        courseId: cm?.courseId ?? '',
        courseTitle: cm?.course?.title ?? '',
      };
    });
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
