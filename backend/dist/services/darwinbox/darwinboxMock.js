import { config } from '../../config/env.js';
// In-memory directory of fictional employee profiles with manager sign-off hierarchy
const MOCK_EMPLOYEE_DIRECTORY = {
    'EMP-1001': {
        employeeId: 'EMP-1001',
        name: 'Aarav Sharma',
        status: 'ACTIVE',
        department: 'Engineering',
        designation: 'Software Engineer',
        managerId: 'MGR-5001',
        managerName: 'Priya Iyer',
        managerEmail: 'priya.iyer@example.com',
        isEligibleForAccess: true,
    },
    'EMP-1002': {
        employeeId: 'EMP-1002',
        name: 'Sejal Patel',
        status: 'ACTIVE',
        department: 'Human Resources',
        designation: 'HR Generalist',
        managerId: 'MGR-5002',
        managerName: 'Kunal Verma',
        managerEmail: 'kunal.verma@example.com',
        isEligibleForAccess: true,
    },
    'EMP-2001': {
        employeeId: 'EMP-2001',
        name: 'Rohan Mehta',
        status: 'INACTIVE',
        department: 'Marketing',
        designation: 'Brand Specialist',
        managerId: 'MGR-5003',
        managerName: 'Anita Desai',
        managerEmail: 'anita.desai@example.com',
        isEligibleForAccess: false,
    },
    'EMP-9999': {
        employeeId: 'EMP-9999',
        name: 'Former Associate',
        status: 'TERMINATED',
        department: 'Operations',
        designation: 'Ex-Specialist',
        isEligibleForAccess: false,
    },
};
export class DarwinboxMockService {
    forcedFailure = null;
    // OAuth2 Token Cache: caches bearer token with expiry time
    tokenCache = null;
    setForcedFailure(failure) {
        this.forcedFailure = failure;
    }
    /**
     * Simulates OAuth2 token acquisition with in-memory caching.
     * If token is cached and valid, reuses it without an extra network call.
     */
    async getValidOAuthToken() {
        const now = Date.now();
        if (this.tokenCache && this.tokenCache.expiresAt > now) {
            return this.tokenCache.token;
        }
        // Refresh token with 3600-second TTL
        const newToken = `mock_db_oauth_${Math.random().toString(36).substring(2, 12)}`;
        this.tokenCache = {
            token: newToken,
            expiresAt: now + 3600 * 1000,
        };
        return newToken;
    }
    async verifyEmployee(employeeId) {
        // 1. Ensure valid OAuth2 Bearer token (from cache)
        await this.getValidOAuthToken();
        // Simulate cloud latency
        if (config.SIMULATE_LATENCY_MS > 0) {
            await new Promise((resolve) => setTimeout(resolve, config.SIMULATE_LATENCY_MS));
        }
        // Check programmatic or trigger-based simulated failures
        if (this.forcedFailure === 'AUTH_FAILURE' || employeeId === 'EMP-AUTH-FAIL') {
            const error = new Error('Darwinbox API Authentication Failed (Invalid Bearer Token)');
            error.status = 401;
            error.code = 'AUTH_FAILURE';
            throw error;
        }
        if (this.forcedFailure === 'RATE_LIMIT' || employeeId === 'EMP-RATE-LIMIT') {
            const error = new Error('Darwinbox API Rate Limit Exceeded (HTTP 429)');
            error.status = 429;
            error.code = 'RATE_LIMITED';
            error.retryAfter = 2; // 2 seconds
            throw error;
        }
        if (this.forcedFailure === 'TIMEOUT' || employeeId === 'EMP-TIMEOUT') {
            const error = new Error('Darwinbox API Gateway Timeout (ETIMEDOUT)');
            error.status = 504;
            error.code = 'TIMEOUT';
            throw error;
        }
        const employee = MOCK_EMPLOYEE_DIRECTORY[employeeId];
        if (!employee) {
            return {
                verified: false,
                employeeId,
                status: 'NOT_FOUND',
                isEligibleForAccess: false,
                errorCode: 'NOT_FOUND',
            };
        }
        return {
            verified: employee.status === 'ACTIVE',
            employeeId: employee.employeeId,
            name: employee.name,
            status: employee.status,
            department: employee.department,
            designation: employee.designation,
            managerId: employee.managerId,
            managerName: employee.managerName,
            managerEmail: employee.managerEmail,
            isEligibleForAccess: employee.isEligibleForAccess,
        };
    }
}
export const darwinboxMock = new DarwinboxMockService();
