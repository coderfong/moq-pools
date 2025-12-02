import NextAuth from 'next-auth';
import { prisma } from './src/lib/prisma';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
});
