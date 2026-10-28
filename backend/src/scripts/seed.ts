import { auth, db } from '../config/firebase.js';

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'approver' | 'viewer';
  displayName: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
    displayName: 'Admin Officer',
  },
  {
    email: 'approver@example.com',
    password: 'Password123!',
    role: 'approver',
    displayName: 'HR Approver',
  },
  {
    email: 'viewer@example.com',
    password: 'Password123!',
    role: 'viewer',
    displayName: 'Audit Viewer',
  },
];

export async function seedDatabase() {
  console.log('🌱 Starting database and auth seeding...');

  // 1. Seed Firebase Auth Users & Custom Claims
  for (const user of TEST_USERS) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(user.email);
        console.log(`ℹ️ User ${user.email} already exists.`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.displayName,
          });
          console.log(`✅ Created test user: ${user.email}`);
        } else {
          throw err;
        }
      }

      // Set Custom Claims for Role-Based Access Control (RBAC)
      await auth.setCustomUserClaims(userRecord.uid, {
        role: user.role,
        isAutomatedTestUser: true,
      });
      console.log(`🔒 Assigned custom claim [role: ${user.role}] to ${user.email}`);
    } catch (err: any) {
      console.warn(`⚠️ Could not create/claim user ${user.email}: ${err.message}`);
    }
  }

  // 2. Seed Fictional Workflow Runs
  const now = new Date();
  const sampleWorkflowRuns = [
    {
      idempotencyKey: 'evt_zd_1042_initial',
      ticketId: 'ZD-1042',
      category: 'HR_ACCESS',
      priority: 'high',
      employeeReference: 'emp_sha256_1001',
      status: 'needs_approval',
      currentStep: 'verifying_employee',
      stepResults: {
        employeeVerification: {
          verified: true,
          status: 'ACTIVE',
          department: 'Engineering',
        },
      },
      requiresApproval: true,
      retryCount: 0,
      maxRetries: 3,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      idempotencyKey: 'evt_zd_1041_completed',
      ticketId: 'ZD-1041',
      category: 'EQUIPMENT',
      priority: 'normal',
      employeeReference: 'emp_sha256_1002',
      status: 'completed',
      currentStep: 'finalizing',
      stepResults: {
        employeeVerification: { verified: true, status: 'ACTIVE', department: 'Human Resources' },
        boxFolder: { folderId: 'box_fld_case_1041', folderUrl: 'https://app.box.com/folder/box_fld_case_1041' },
        zendeskUpdate: { success: true },
      },
      requiresApproval: false,
      retryCount: 0,
      maxRetries: 3,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: new Date(now.getTime() - 1000 * 60 * 15),
      completedAt: new Date(now.getTime() - 1000 * 60 * 14),
      createdAt: new Date(now.getTime() - 1000 * 60 * 15),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 14),
    },
    {
      idempotencyKey: 'evt_zd_1040_failed',
      ticketId: 'ZD-1040',
      category: 'GENERAL',
      priority: 'low',
      employeeReference: 'emp_sha256_9999',
      status: 'failed',
      currentStep: 'verifying_employee',
      stepResults: {},
      requiresApproval: false,
      retryCount: 3,
      maxRetries: 3,
      errorCode: 'ERR_EMPLOYEE_NOT_FOUND',
      errorMessage: 'Employee EMP-9999 is inactive or does not exist in Darwinbox',
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: new Date(now.getTime() - 1000 * 60 * 60),
      completedAt: new Date(now.getTime() - 1000 * 60 * 59),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 59),
    },
  ];

  for (const run of sampleWorkflowRuns) {
    await db.collection('workflowRuns').doc(run.idempotencyKey).set(run);
    console.log(`📝 Seeded workflowRun: ${run.idempotencyKey} (${run.ticketId} - ${run.status})`);
  }

  // 3. Seed Ticket Mappings
  const sampleMappings = [
    {
      ticketId: 'ZD-1041',
      boxFolderId: 'box_fld_case_1041',
      boxFolderUrl: 'https://app.box.com/folder/box_fld_case_1041',
      employeeReference: 'emp_sha256_1002',
      status: 'active',
      createdAt: new Date(now.getTime() - 1000 * 60 * 15),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 14),
    },
  ];

  for (const mapping of sampleMappings) {
    await db.collection('ticketMappings').doc(mapping.ticketId).set(mapping);
    console.log(`📁 Seeded ticketMapping: ${mapping.ticketId} -> Box Folder ${mapping.boxFolderId}`);
  }

  // 4. Seed Audit Logs
  const sampleAuditLogs = [
    {
      workflowId: 'evt_zd_1041_completed',
      ticketId: 'ZD-1041',
      actor: 'system',
      action: 'WEBHOOK_RECEIVED',
      result: 'SUCCESS',
      metadata: { category: 'EQUIPMENT', priority: 'normal' },
      timestamp: new Date(now.getTime() - 1000 * 60 * 15),
    },
    {
      workflowId: 'evt_zd_1041_completed',
      ticketId: 'ZD-1041',
      actor: 'system',
      action: 'EMPLOYEE_VERIFIED',
      result: 'SUCCESS',
      metadata: { department: 'Human Resources' },
      timestamp: new Date(now.getTime() - 1000 * 60 * 14.8),
    },
    {
      workflowId: 'evt_zd_1041_completed',
      ticketId: 'ZD-1041',
      actor: 'system',
      action: 'BOX_FOLDER_RESOLVED',
      result: 'SUCCESS',
      metadata: { folderId: 'box_fld_case_1041' },
      timestamp: new Date(now.getTime() - 1000 * 60 * 14.5),
    },
    {
      workflowId: 'evt_zd_1041_completed',
      ticketId: 'ZD-1041',
      actor: 'system',
      action: 'WORKFLOW_COMPLETED',
      result: 'SUCCESS',
      metadata: { durationMs: 650 },
      timestamp: new Date(now.getTime() - 1000 * 60 * 14),
    },
  ];

  for (const log of sampleAuditLogs) {
    await db.collection('auditLogs').add(log);
  }
  console.log(`📜 Seeded ${sampleAuditLogs.length} immutable audit logs.`);

  console.log('✨ Seeding completed successfully!');
}

// Run directly if invoked via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

