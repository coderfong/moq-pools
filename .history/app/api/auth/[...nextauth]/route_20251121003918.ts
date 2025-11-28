// NextAuth v5 API Route
// Import the handlers from the centralized auth.ts configuration
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
