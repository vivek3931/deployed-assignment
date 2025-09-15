// src/auth/guards/role.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Custom roles decorator
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: Array<'doctor' | 'patient'>) =>
  SetMetadata('roles', roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<
      Array<'doctor' | 'patient'>
    >('roles', [context.getHandler(), context.getClass()]);

    if (!requiredRoles) {
      return true; // no role restriction → allow
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(
          ', ',
        )}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
