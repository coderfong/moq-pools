import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import Twitter from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './src/lib/prisma';

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Links accounts with same email
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma?.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
          select: { id: true, email: true, name: true, passwordHash: true, image: true, role: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // On first sign in, user object is available
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'BUYER';
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!prisma) return true;
      
      // For OAuth providers, create user if doesn't exist
      if (account?.provider !== 'credentials') {
        try {
          if (!user.email) return false;
          
          // Check if user already exists
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          
          if (!existingUser) {
            // Create new user for OAuth sign-in
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split('@')[0],
                image: user.image,
                role: 'BUYER',
                emailVerified: new Date(), // OAuth emails are pre-verified
              },
            });
            
            console.log(`Created new user via ${account.provider}:`, existingUser.email);
          } else {
            // Update user info if changed
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            });
          }
          
          // Update user.id for JWT token
          user.id = existingUser.id;
          
          // Check if this OAuth account is already linked
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });
          
          // Create Account record if it doesn't exist
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
            
            console.log(`Linked ${account.provider} account to user:`, existingUser.email);
          }
          
          return true;
        } catch (error) {
          console.error('OAuth sign-in error:', error);
          return false;
        }
      }
      
      return true;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
