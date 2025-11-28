import { PrismaClient } from '../../prisma/generated/client3';

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

// Legacy export used across the codebase; may be undefined if DATABASE_URL isn't set
export const prisma = client;

// Prefer this accessor in API routes: it either returns a live client or throws a descriptive error.
export function getPrisma(): PrismaClient {
	if (client) return client;
	if (!process.env.DATABASE_URL) {
		throw new Error('db_unavailable: missing_DATABASE_URL');
	}
	// Lazily instantiate if env is present but client wasn't created yet
	const c = new PrismaClient();
	if (process.env.NODE_ENV !== 'production') global.prisma = c;
	client = c;
	return c;
}
