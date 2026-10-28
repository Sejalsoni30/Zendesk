import { config } from '../../config/env.js';
import { IBoxService, BoxFolderResult, BoxProvisionOptions, BoxCollaborator } from '../interfaces.js';

interface VirtualBoxFolder {
  id: string;
  name: string;
  path: string;
  url: string;
  sharedLink: string;
  parentFolderId: string;
  collaborators: BoxCollaborator[];
  createdAt: string;
}

export class BoxMockService implements IBoxService {
  private folders: Map<string, VirtualBoxFolder> = new Map();
  private forcedFailure: 'SERVICE_UNAVAILABLE' | 'AUTH_FAILURE' | 'RATE_LIMIT' | null = null;
  private failureCountdown: number = 0;

  constructor() {
    // Seed with a default folder for testing pre-existing folders
    this.folders.set('CASE-ZD-9999', {
      id: 'box_fld_existing_9999',
      name: 'CASE-ZD-9999',
      path: '/HR-Records/Employee-EMP-1001-Aarav/CASE-ZD-9999',
      url: 'https://app.box.com/folder/box_fld_existing_9999',
      sharedLink: 'https://app.box.com/s/demo_shared_link_9999',
      parentFolderId: '0',
      collaborators: [{ email: 'admin@example.com', role: 'editor' }],
      createdAt: new Date().toISOString(),
    });
  }

  public setForcedFailure(failure: 'SERVICE_UNAVAILABLE' | 'AUTH_FAILURE' | 'RATE_LIMIT' | null, times = 1) {
    this.forcedFailure = failure;
    this.failureCountdown = times;
  }

  private checkFailure(triggerName: string) {
    if (this.forcedFailure && this.failureCountdown > 0) {
      this.failureCountdown--;
      if (this.forcedFailure === 'SERVICE_UNAVAILABLE') {
        const err: any = new Error('Box API 503 Service Temporarily Unavailable');
        err.status = 503;
        err.code = 'BOX_UNAVAILABLE';
        throw err;
      }
      if (this.forcedFailure === 'RATE_LIMIT') {
        const err: any = new Error('Box API 429 Too Many Requests');
        err.status = 429;
        err.code = 'RATE_LIMITED';
        throw err;
      }
    }

    if (triggerName.includes('UNAVAILABLE')) {
      const err: any = new Error('Box API 503 Service Temporarily Unavailable');
      err.status = 503;
      err.code = 'BOX_UNAVAILABLE';
      throw err;
    }
  }

  async findFolder(folderName: string, _parentFolderId = '0'): Promise<BoxFolderResult | null> {
    if (config.SIMULATE_LATENCY_MS > 0) {
      await new Promise((r) => setTimeout(r, config.SIMULATE_LATENCY_MS));
    }

    this.checkFailure(folderName);

    const folder = this.folders.get(folderName);
    if (!folder) return null;

    return {
      folderId: folder.id,
      folderName: folder.name,
      folderPath: folder.path,
      folderUrl: folder.url,
      sharedLink: folder.sharedLink,
      collaborators: folder.collaborators,
      isExisting: true,
    };
  }

  async createFolder(folderName: string, parentFolderId = '0'): Promise<BoxFolderResult> {
    if (config.SIMULATE_LATENCY_MS > 0) {
      await new Promise((r) => setTimeout(r, config.SIMULATE_LATENCY_MS));
    }

    this.checkFailure(folderName);

    const existing = this.folders.get(folderName);
    if (existing) {
      return {
        folderId: existing.id,
        folderName: existing.name,
        folderPath: existing.path,
        folderUrl: existing.url,
        sharedLink: existing.sharedLink,
        collaborators: existing.collaborators,
        isExisting: true,
      };
    }

    const folderId = `box_fld_${Math.random().toString(36).substring(2, 10)}`;
    const folderUrl = `https://app.box.com/folder/${folderId}`;
    const sharedLink = `https://app.box.com/s/link_${folderId}`;

    const newFolder: VirtualBoxFolder = {
      id: folderId,
      name: folderName,
      path: `/${folderName}`,
      url: folderUrl,
      sharedLink,
      parentFolderId,
      collaborators: [],
      createdAt: new Date().toISOString(),
    };

    this.folders.set(folderName, newFolder);

    return {
      folderId,
      folderName,
      folderPath: newFolder.path,
      folderUrl,
      sharedLink,
      collaborators: [],
      isExisting: false,
    };
  }

  /**
   * Provisions an enterprise folder structure: /HR-Records/Employee-[ID]-[Name]/CASE-[TicketID]/
   * Sets granular collaborator permissions and generates a secure shared link.
   */
  async provisionCaseFolder(options: BoxProvisionOptions): Promise<BoxFolderResult> {
    const { ticketId, employeeId, employeeName, collaborators = [] } = options;
    const sanitizedName = (employeeName || 'Staff').replace(/[^a-zA-Z0-9]/g, '');
    const folderKey = `CASE-${ticketId}`;
    const enterprisePath = `/HR-Records/Employee-${employeeId}-${sanitizedName}/CASE-${ticketId}`;

    this.checkFailure(folderKey);

    const existing = this.folders.get(folderKey);
    if (existing) {
      return {
        folderId: existing.id,
        folderName: existing.name,
        folderPath: existing.path,
        folderUrl: existing.url,
        sharedLink: existing.sharedLink,
        collaborators: existing.collaborators,
        isExisting: true,
      };
    }

    const folderId = `box_fld_${ticketId.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`;
    const folderUrl = `https://app.box.com/folder/${folderId}`;
    const sharedLink = `https://app.box.com/s/secure_link_${folderId}`;

    const newFolder: VirtualBoxFolder = {
      id: folderId,
      name: folderKey,
      path: enterprisePath,
      url: folderUrl,
      sharedLink,
      parentFolderId: '0',
      collaborators,
      createdAt: new Date().toISOString(),
    };

    this.folders.set(folderKey, newFolder);

    return {
      folderId,
      folderName: folderKey,
      folderPath: enterprisePath,
      folderUrl,
      sharedLink,
      collaborators,
      isExisting: false,
    };
  }

  async getFolderUrl(folderId: string): Promise<string> {
    for (const folder of this.folders.values()) {
      if (folder.id === folderId) {
        return folder.url;
      }
    }
    return `https://app.box.com/folder/${folderId}`;
  }

  // Clear virtual state between tests
  public reset() {
    this.folders.clear();
    this.forcedFailure = null;
    this.failureCountdown = 0;
  }
}

export const boxMock = new BoxMockService();

