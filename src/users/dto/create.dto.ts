export class CreateUserDto {
  username: string;
  email: string;
  password?: string;
  provider: 'local' | 'google';
}
