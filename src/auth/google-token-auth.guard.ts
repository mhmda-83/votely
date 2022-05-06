import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleTokenAuthGuard extends AuthGuard('google-token') {
  constructor() {
    super();
  }
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (request.user) {
      throw new UnauthorizedException('You are already logged in.');
    }

    const result = (await super.canActivate(context)) as boolean;

    await super.logIn(request);

    return result;
  }
}
