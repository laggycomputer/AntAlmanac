import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

/**
 * Environment variables required by the backend to connect to the RDS instance.
 */
export const rdsEnvSchema = z.object({
    DB_URL: z.string(),
    NODE_ENV: z.string().optional(),
});

export const aapiKey = z.object({
    ANTEATER_API_KEY: z.string(),
});
