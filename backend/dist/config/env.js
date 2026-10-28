import dotenv from 'dotenv';
import { z } from 'zod';
// Load environment variables from .env file
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // Mock / Real Toggle
    USE_MOCK_SERVICES: z.preprocess((val) => String(val).toLowerCase() === 'true', z.boolean().default(true)),
    SIMULATE_LATENCY_MS: z.coerce.number().default(50),
    // Firebase
    FIREBASE_PROJECT_ID: z.string().default('demo-zendesk-automation'),
    FIRESTORE_EMULATOR_HOST: z.string().optional(),
    FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    // Zendesk
    ZENDESK_SUBDOMAIN: z.string().default('demo-company'),
    ZENDESK_ADMIN_EMAIL: z.string().email().default('it-support@example.com'),
    ZENDESK_API_TOKEN: z.string().default('mock_zendesk_token'),
    ZENDESK_WEBHOOK_SECRET: z.string().default('demo_webhook_signing_secret_key_883399'),
    ZENDESK_WRITEBACK_ENABLED: z.preprocess((val) => String(val).toLowerCase() === 'true', z.boolean().default(true)),
    // Darwinbox
    DARWINBOX_BASE_URL: z.string().url().default('https://api.darwinbox.example.com'),
    DARWINBOX_CLIENT_ID: z.string().default('mock_db_client_id'),
    DARWINBOX_CLIENT_SECRET: z.string().default('mock_db_client_secret'),
    DARWINBOX_API_KEY: z.string().default('mock_db_api_key'),
    // Box
    BOX_CLIENT_ID: z.string().default('mock_box_client_id'),
    BOX_CLIENT_SECRET: z.string().default('mock_box_client_secret'),
    BOX_ENTERPRISE_ID: z.string().default('mock_box_enterprise_id'),
    BOX_PARENT_FOLDER_ID: z.string().default('0'),
    // Workflow Settings
    LEASE_DURATION_SECONDS: z.coerce.number().default(60),
    MAX_WORKFLOW_RETRIES: z.coerce.number().default(3),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ FATAL: Invalid backend environment configuration:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}
export const config = parsed.data;
