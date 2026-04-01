import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUserPayload = {
  id: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string | null;
};

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserPayload }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
