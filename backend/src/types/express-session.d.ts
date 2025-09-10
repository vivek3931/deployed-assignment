import 'express-session';

declare module 'express-session' {
  interface SessionData {
    role?: 'doctor' | 'patient';
  }
}
