import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('access-token') {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any) {
    return user;
  }
}
