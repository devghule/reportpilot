import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.getMe(currentUser.userId);
  }

  @Delete('me')
  deleteMe(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.deleteMe(currentUser.userId);
  }
}
