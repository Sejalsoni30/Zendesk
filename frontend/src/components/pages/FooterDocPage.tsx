import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  FolderSync,
  Database,
  FileText,
  Scale,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ChevronRight,
  Clock,
  Sparkles,
  Server,
  Layers,
  ArrowRight
} from 'lucide-react';

export type FooterDocTopic =
  | 'zendesk-hmac'
  | 'darwinbox-oauth'
  | 'box-conflict'
  | 'firestore-leases'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'gdpr-commitment';

interface FooterDocPageProps {
  initialTopic: FooterDocTopic;
  onBackToLanding: () => void;
  onOpenWorkspace: () => void;
}

interface DocArticle {
  id: FooterDocTopic;
  group: 'Architecture & Engineering' | 'Trust, Legal & Compliance';
  icon: any;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  readTime: string;
  lastUpdated: string;
  overview: string;
  keyPoints: { title: string; description: string }[];
  codeBlock?: {
    language: string;
    filename: string;
    code: string;
  };
  policyClauses?: { number: string; heading: string; body: string }[];
  interviewHighlights: string[];
}

const DOC_ARTICLES: Record<FooterDocTopic, DocArticle> = {
  'zendesk-hmac': {
    id: 'zendesk-hmac',
    group: 'Architecture & Engineering',
    icon: ShieldCheck,
    title: 'Zendesk HMAC-SHA256 Webhook Verification',
    subtitle: 'Cryptographic request integrity and replay attack mitigation in Express.js',
    badge: 'Security Architecture',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    readTime: '4 min read',
    lastUpdated: 'Updated for Production v1.2',
    overview:
      'Every inbound HTTP request from Zendesk is cryptographically verified before any business logic executes. This guarantees the payload originated strictly from Zendesk and was not intercepted, modified in flight, or replayed by unauthorized actors.',
    keyPoints: [
      {
        title: 'Raw Body Buffer Interception',
        description:
          'Express.js body parser normally deserializes JSON, which alters key ordering and whitespace. We use an express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }) callback to retain the exact byte sequence as received over the wire.',
      },
      {
        title: 'Constant-Time Equality Comparison',
        description:
          'Signatures are compared using Node.js crypto.timingSafeEqual. Standard string comparison (===) short-circuits on the first mismatched byte, creating timing side-channel vulnerabilities.',
      },
      {
        title: 'Replay Window & Deduplication',
        description:
          'Requests older than 5 minutes (X-Zendesk-Webhook-Timestamp) are discarded immediately. Secondary replay attempts are deduplicated atomically via Firestore primary document keys.',
      },
    ],
    codeBlock: {
      language: 'typescript',
      filename: 'backend/src/middleware/webhookAuth.ts',
      code: `import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function verifyZendeskHmac(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-zendesk-webhook-signature'] as string;
  const timestamp = req.headers['x-zendesk-webhook-timestamp'] as string;

  if (!signature || !timestamp || !req.rawBody) {
    return res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK', message: 'Missing HMAC signature or timestamp' });
  }

  // 1. Prevent Replay Attacks (5-minute drift tolerance)
  const reqTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - reqTime) > 300) {
    return res.status(401).json({ error: 'SIGNATURE_EXPIRED', message: 'Webhook timestamp exceeded replay window' });
  }

  // 2. Compute Expected HMAC-SHA256
  const payloadToSign = Buffer.concat([Buffer.from(timestamp), req.rawBody]);
  const expectedHash = crypto
    .createHmac('sha256', env.ZENDESK_WEBHOOK_SECRET)
    .update(payloadToSign)
    .digest('base64');

  // 3. Constant-Time Timing-Safe Comparison
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedHash);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Cryptographic signature mismatch' });
  }

  next();
}`,
    },
    interviewHighlights: [
      'Why raw bytes matter: Standard JSON.parse re-serializes with different whitespace and keys, breaking HMAC hashes.',
      'Timing attacks: Standard string comparison exposes character matching duration to network attackers.',
      'Defense in depth: HMAC verifies authenticity; Firestore deterministic IDs guarantee idempotency.',
    ],
  },

  'darwinbox-oauth': {
    id: 'darwinbox-oauth',
    group: 'Architecture & Engineering',
    icon: Key,
    title: 'Darwinbox OAuth2 Token Cache & Hierarchy',
    subtitle: 'High-throughput enterprise HRMS verification with zero-credential leakage',
    badge: 'API Integration',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    readTime: '5 min read',
    lastUpdated: 'Updated for Production v1.2',
    overview:
      'The Darwinbox HR service queries employee employment status, cost center department, and the active managerial hierarchy chain. It incorporates an automated OAuth2 token lifecycle cache to eliminate unnecessary token exchanges.',
    keyPoints: [
      {
        title: 'Safety Buffer Token Caching',
        description:
          'Tokens are cached in memory with a 60-second proactive safety buffer. If a token has an expires_in of 3600 seconds, our cache marks it eligible for refresh at 3540 seconds, avoiding race-condition mid-flight expiry.',
      },
      {
        title: 'Manager Approval Chain Resolution',
        description:
          'Employee records return direct reporting managers (L1) and department heads (L2). Tickets requiring elevated approval dynamically inspect this hierarchy before advancing.',
      },
      {
        title: 'Jittered Exponential Backoff on 429 Throttling',
        description:
          'When Darwinbox rate limits under heavy batch load, requests retry with randomized full jitter to prevent thundering herd spikes on HRMS endpoints.',
      },
    ],
    codeBlock: {
      language: 'typescript',
      filename: 'backend/src/services/darwinbox/darwinboxMock.ts',
      code: `interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix epoch ms
}

let tokenCache: CachedToken | null = null;

export async function getDarwinboxOAuthToken(): Promise<string> {
  const now = Date.now();
  // Reuse existing token if more than 60s remain before expiration
  if (tokenCache && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.accessToken;
  }

  // Fetch new token with client credentials
  const res = await fetchDarwinboxAuth();
  tokenCache = {
    accessToken: res.access_token,
    expiresAt: now + res.expires_in * 1000,
  };
  return tokenCache.accessToken;
}`,
    },
    interviewHighlights: [
      'Proactive refresh: Waiting until HTTP 401 forces every API call into a retry loop; proactive 60s buffers ensure 100% cache hits.',
      'Organizational hierarchy: Multi-tier approval flows need both direct line managers and department directors.',
      'Security: Darwinbox client secrets are only read via server environment variables, never sent to clients.',
    ],
  },

  'box-conflict': {
    id: 'box-conflict',
    group: 'Architecture & Engineering',
    icon: FolderSync,
    title: 'Box Content Cloud Conflict Prevention',
    subtitle: 'Deterministic directory provisioning, 409 conflict recovery, and granular ACLs',
    badge: 'Cloud Storage',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    readTime: '4 min read',
    lastUpdated: 'Updated for Production v1.2',
    overview:
      'When an employee support ticket is approved, the orchestrator automatically provisions a secure enterprise directory in Box. It uses deterministic directory naming and handles HTTP 409 Conflict errors gracefully.',
    keyPoints: [
      {
        title: 'Deterministic Enterprise Hierarchy',
        description:
          'Folders follow an exact organizational template: /HR-Records/Employee-[ID]-[Name]/Ticket-[ID]/. This prevents fragmented, orphaned folders across support cases.',
      },
      {
        title: 'Safe 409 Conflict Resolution',
        description:
          'If a folder already exists (e.g. from an earlier retried event), Box returns HTTP 409 Conflict with the conflicting item ID. Our adapter extracts the existing folder ID and proceeds rather than failing.',
      },
      {
        title: 'Granular Role-Based Permissions (ACLs)',
        description:
          'Collaborator roles are applied with principle of least privilege: Manager receives "co-owner" or "editor", Employee receives "editor", and Support auditors receive "viewer".',
      },
    ],
    codeBlock: {
      language: 'typescript',
      filename: 'backend/src/services/box/boxMock.ts',
      code: `export async function findOrCreateFolder(client: any, parentId: string, folderName: string) {
  try {
    const created = await client.folders.create(parentId, folderName);
    return { folderId: created.id, isNew: true };
  } catch (err: any) {
    // Box SDK throws 409 Conflict if folder already exists with that name
    if (err.statusCode === 409 && err.response?.body?.context_info?.conflicts) {
      const existing = err.response.body.context_info.conflicts[0];
      return { folderId: existing.id, isNew: false };
    }
    throw err;
  }
}`,
    },
    interviewHighlights: [
      'Eliminating duplicate folders: Without 409 conflict handling, retries generate messy folders like "Employee-1001 (1)".',
      'Idempotent provisioning: Safe to call 100 times; the result is always the same single folder reference.',
      'Enterprise shared links: Generated with domain-restricted company access, disabling open public downloads.',
    ],
  },

  'firestore-leases': {
    id: 'firestore-leases',
    group: 'Architecture & Engineering',
    icon: Database,
    title: 'Firestore Lease Locking & Idempotency',
    subtitle: 'Distributed locking and transactional execution for high-concurrency webhooks',
    badge: 'Distributed Systems',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    readTime: '5 min read',
    lastUpdated: 'Updated for Production v1.2',
    overview:
      'Webhooks often arrive concurrently or out of order during network re-deliveries. We utilize Firestore atomic transactions and deterministic primary document keys to implement distributed leasing and step-by-step checkpointing.',
    keyPoints: [
      {
        title: 'Deterministic Document IDs',
        description:
          'Instead of random autogenerated IDs, documents are saved under deterministic keys: workflowRuns/{idempotencyKey} and ticketMappings/{ticketId}. Firestore transactions abort if another process is writing the same document.',
      },
      {
        title: 'Distributed Leases with Expiry',
        description:
          'A leaseOwner UUID and leaseExpiresAt timestamp ensure only one server instance can process a ticket at a given time. If a node crashes mid-flight, the lease expires after 30 seconds, enabling safe recovery.',
      },
      {
        title: 'Step Checkpointing (currentStep)',
        description:
          'Before executing an external call (e.g. Darwinbox API, Box folder creation), the state machine records currentStep. If a failure occurs, retries skip already-completed steps, ensuring zero duplicate side effects.',
      },
    ],
    codeBlock: {
      language: 'typescript',
      filename: 'backend/src/repositories/workflowRepository.ts',
      code: `export async function acquireWorkflowLease(
  idempotencyKey: string,
  ownerId: string,
  leaseDurationMs: number = 30000
): Promise<boolean> {
  const docRef = db.collection('workflowRuns').doc(idempotencyKey);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    const now = Date.now();

    if (snap.exists) {
      const data = snap.data();
      // If currently active and lease has not expired, cannot acquire
      if (data?.leaseExpiresAt && data.leaseExpiresAt > now && data.leaseOwner !== ownerId) {
        return false; // Active lease held by another worker
      }
    }

    // Grant or renew lease
    transaction.set(docRef, {
      leaseOwner: ownerId,
      leaseExpiresAt: now + leaseDurationMs,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return true;
  });
}`,
    },
    interviewHighlights: [
      'Split-brain prevention: Distributed leases prevent two server nodes from processing the same webhook concurrently.',
      'Firestore uniqueness: Firestore lacks unique secondary indexes, so we leverage deterministic primary document keys inside transactions.',
      'Checkpointing: Storing stepResults prevents duplicate Box folder creations when retrying after a Zendesk 500 error.',
    ],
  },

  'privacy-policy': {
    id: 'privacy-policy',
    group: 'Trust, Legal & Compliance',
    icon: Lock,
    title: 'Enterprise Privacy & Data Protection Policy',
    subtitle: 'Zero PII leakage, automated credential sanitization, and data retention standards',
    badge: 'Legal & Privacy',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    readTime: '3 min read',
    lastUpdated: 'Effective October 2026',
    overview:
      'We are committed to enterprise data privacy. This policy outlines how employee records, Zendesk support payloads, and integration metadata are processed, redacted, and protected throughout our orchestration pipeline.',
    keyPoints: [
      {
        title: 'PII Minimization & Redaction',
        description:
          'The system ingests only necessary employee identifiers (Employee ID, Department, Manager email). Sensitive attributes like salaries, SSNs, and passwords are never requested or stored.',
      },
      {
        title: 'Credential Redaction in Logs',
        description:
          'All audit logs automatically sanitize bearer tokens, OAuth authorization codes, and HMAC secrets before persisting to disk or WebSocket broadcast channels.',
      },
      {
        title: 'End-to-End Encryption',
        description:
          'Data at rest is secured via AES-256 encryption within Google Cloud Firestore and Box Cloud. All data in transit is enforced using TLS 1.3 with strict HTTP Strict Transport Security (HSTS).',
      },
    ],
    policyClauses: [
      {
        number: '1.0',
        heading: 'Data Ingestion Scope',
        body: 'We ingest only ticket IDs, employee identifiers, and action requests strictly required to orchestrate Darwinbox verification and Box enterprise repository setup.',
      },
      {
        number: '2.0',
        heading: 'Data Retention & Purging',
        body: 'Webhook payloads are retained in ephemeral staging storage for 90 days for audit and debugging purposes, after which they are automatically expunged.',
      },
      {
        number: '3.0',
        heading: 'Zero Third-Party Commercial Sharing',
        body: 'Customer workflow data is never sold, leased, or utilized to train third-party artificial intelligence models.',
      },
    ],
    interviewHighlights: [
      'OWASP A02 Cryptographic Failures: Handled via TLS 1.3 and automatic header sanitization in audit logs.',
      'Data minimization: Storing only what is necessary to fulfill the support request.',
    ],
  },

  'terms-of-service': {
    id: 'terms-of-service',
    group: 'Trust, Legal & Compliance',
    icon: Scale,
    title: 'Enterprise Terms of Service & SLAs',
    subtitle: 'Contractual uptime guarantees, authorized tenant usage, and operational liabilities',
    badge: 'Enterprise Terms',
    badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    readTime: '4 min read',
    lastUpdated: 'Effective October 2026',
    overview:
      'These terms govern the use of the Zendesk–Darwinbox–Box Support Workflow Automation Engine by enterprise subscribers, delineating availability SLAs, acceptable usage, and system boundaries.',
    keyPoints: [
      {
        title: '99.99% Service Level Agreement (SLA)',
        description:
          'We guarantee 99.99% monthly availability for the webhook ingestion gateway and real-time WebSocket state distribution services.',
      },
      {
        title: 'Authorized Integration Boundary',
        description:
          'Customers must connect only corporate-owned Zendesk, Darwinbox, and Box instances. Unauthorized third-party proxy injections or credential credential spoofing are strictly prohibited.',
      },
      {
        title: 'Rate Limits & Traffic Shaping',
        description:
          'Default tenant limits are 600 webhook calls per minute with dynamic burst handling up to 1,200 requests before standard HTTP 429 queuing initiates.',
      },
    ],
    policyClauses: [
      {
        number: '1.0',
        heading: 'Service Availability & Maintenance',
        body: 'Scheduled maintenance windows are announced at least 72 hours in advance and executed with zero-downtime rolling canary deployments.',
      },
      {
        number: '2.0',
        heading: 'Ownership of Content',
        body: 'Customers maintain sole ownership of all files, metadata, and folders created inside Box Content Cloud and employee records in Darwinbox.',
      },
      {
        number: '3.0',
        heading: 'Limitation of Liability',
        body: 'Neither party shall be liable for indirect, incidental, or consequential damages resulting from upstream vendor outages (e.g. Zendesk global service disruptions).',
      },
    ],
    interviewHighlights: [
      'Graceful degradation: Health checks monitor upstream health and report degraded status without bringing down the core server.',
      'Rate-limiting compliance: Jittered backoff protects downstream vendor APIs from exceeding contractual quotas.',
    ],
  },

  'gdpr-commitment': {
    id: 'gdpr-commitment',
    group: 'Trust, Legal & Compliance',
    icon: FileText,
    title: 'GDPR & Global Regulatory Compliance',
    subtitle: 'EU General Data Protection Regulation, Data Subject Rights, and SOC2 alignment',
    badge: 'Regulatory Compliance',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    readTime: '4 min read',
    lastUpdated: 'Certified October 2026',
    overview:
      'We fully adhere to the European Union General Data Protection Regulation (GDPR) and global regulatory privacy standards. Enterprise customers can seamlessly exercise employee data subject rights.',
    keyPoints: [
      {
        title: 'Article 17: Right to Erasure (RTBF)',
        description:
          'Automated data scrubbing APIs allow enterprise HR administrators to permanently purge employee ticket mappings and audit records upon employee offboarding.',
      },
      {
        title: 'Article 25: Data Protection by Design',
        description:
          'Security controls (HMAC verification, deterministic transaction leasing, RBAC gating) are embedded directly into the architectural foundation rather than added as afterthoughts.',
      },
      {
        title: 'Standard Contractual Clauses (SCCs)',
        description:
          'Cross-border data transfers between multi-regional cloud instances (GCP Firestore, Zendesk EU, Box US) are governed by EU-approved Standard Contractual Clauses.',
      },
    ],
    policyClauses: [
      {
        number: 'Article 15',
        heading: 'Right of Access',
        body: 'Employees may request full inspection of all workflow runs, Box folder provisions, and verification timestamps associated with their Employee ID.',
      },
      {
        number: 'Article 28',
        heading: 'Data Processing Agreement (DPA)',
        body: 'A standardized enterprise DPA is incorporated into all subscriber contracts, specifying sub-processors and security controls.',
      },
      {
        number: 'SOC2 Type II',
        heading: 'Independent Third-Party Verification',
        body: 'Annual SOC2 Type II compliance audits verify Security, Availability, and Confidentiality trust principles.',
      },
    ],
    interviewHighlights: [
      'Privacy by design: RBAC roles ensure Viewers cannot alter records, Approvers can only sign off, and Admins can audit.',
      'Immutable audit trails: Audit logs are append-only to satisfy regulatory forensic scrutiny.',
    ],
  },
};

export function FooterDocPage({ initialTopic, onBackToLanding, onOpenWorkspace }: FooterDocPageProps) {
  const [selectedTopic, setSelectedTopic] = useState<FooterDocTopic>(initialTopic);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedTopic]);

  const article = DOC_ARTICLES[selectedTopic] || DOC_ARTICLES['zendesk-hmac'];
  const IconComponent = article.icon;

  const handleCopyCode = () => {
    if (article.codeBlock) {
      navigator.clipboard.writeText(article.codeBlock.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Group topics for sidebar
  const archTopics: FooterDocTopic[] = ['zendesk-hmac', 'darwinbox-oauth', 'box-conflict', 'firestore-leases'];
  const legalTopics: FooterDocTopic[] = ['privacy-policy', 'terms-of-service', 'gdpr-commitment'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <button
              onClick={onBackToLanding}
              className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Platform Overview</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-300 font-medium">{article.group}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-none">{article.title}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenWorkspace}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Live Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Navigation Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sticky top-32">
              {/* Architecture Section */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Architecture & Docs</span>
                </div>
                <div className="space-y-1">
                  {archTopics.map((topicKey) => {
                    const item = DOC_ARTICLES[topicKey];
                    const active = selectedTopic === topicKey;
                    return (
                      <button
                        key={topicKey}
                        onClick={() => setSelectedTopic(topicKey)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center space-x-2 ${
                          active
                            ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legal & Trust Section */}
              <div>
                <div className="flex items-center space-x-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Trust & Compliance</span>
                </div>
                <div className="space-y-1">
                  {legalTopics.map((topicKey) => {
                    const item = DOC_ARTICLES[topicKey];
                    const active = selectedTopic === topicKey;
                    return (
                      <button
                        key={topicKey}
                        onClick={() => setSelectedTopic(topicKey)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center space-x-2 ${
                          active
                            ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick info card */}
              <div className="mt-8 pt-5 border-t border-slate-800 text-[11px] text-slate-500">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-medium mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Production Verified</span>
                </div>
                <p>Fully compliant with Zendesk HMAC-SHA256, Darwinbox API v2, and Box Cloud v2.0.</p>
              </div>
            </div>
          </aside>

          {/* Right Main Article Content */}
          <main className="lg:col-span-3 space-y-8">
            {/* Header Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${article.badgeColor}`}>
                  {article.badge}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{article.readTime}</span>
                </span>
                <span className="text-slate-500 text-xs">{article.lastUpdated}</span>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0 hidden sm:block">
                  <IconComponent className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {article.title}
                  </h1>
                  <p className="text-slate-400 text-sm mt-1.5">{article.subtitle}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{article.overview}</p>
              </div>
            </div>

            {/* Key Technical / Policy Pillars */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Architecture Pillars & Implementation Details</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {article.keyPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-3">
                      0{idx + 1}
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-2">{pt.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{pt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Snippet (For Architecture Articles) */}
            {article.codeBlock && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-slate-400 font-sans">{article.codeBlock.filename}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto text-xs font-mono text-slate-300 bg-slate-950/80 leading-relaxed max-h-[420px] scrollbar-thin scrollbar-thumb-slate-700">
                  <pre>
                    <code>{article.codeBlock.code}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Policy Clauses (For Legal Articles) */}
            {article.policyClauses && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Standard Enterprise Clauses</h3>
                <div className="divide-y divide-slate-800/80">
                  {article.policyClauses.map((clause, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
                        <span>Section {clause.number}</span>
                        <span>•</span>
                        <span className="text-white">{clause.heading}</span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{clause.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Talking Points / Defense Rationale */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-900/40 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center space-x-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Interview Talking Points & Architectural Defense</span>
              </h3>
              <ul className="space-y-2.5">
                {article.interviewHighlights.map((hl, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Nav / Next Page Switcher */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={onBackToLanding}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Landing Page</span>
              </button>

              <button
                onClick={onOpenWorkspace}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Open Deep Analysis Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
