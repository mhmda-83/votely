import { User } from '@prisma/client';
import { Request } from 'express';

declare module 'express' {
  export interface Request {
    user: User;
  }
}
