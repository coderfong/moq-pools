import { PrismaClient } from '../../prisma/generated/client';

// Only instantiate Prisma when a DATABASE_URL is configured.
// This prevents crashes in environments where a DB isn't available (e.g., FAST mode or static previews).
declare global {
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined;
}

let client: PrismaClient | undefined = undefined;
if (process.env.DATABASE_URL) {
	client = global.prisma ?? new PrismaClient();
	if (process.env.NODE_ENV !== 'production') global.prisma = client;
}

export const prisma = client;
