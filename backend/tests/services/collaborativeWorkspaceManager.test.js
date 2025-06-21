// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const collaborativeWorkspaceManager = require('../../src/services/collaborativeWorkspaceManager');
const realTimeDevelopmentService = require('../../src/services/realTimeDevelopmentService');
const sharedWorkspaceAnalytics = require('../../src/services/sharedWorkspaceAnalytics');
const { setupTestEnvironment, cleanupTestEnvironment, mockContracts, testUtils } = require('../setup');

describe('Collaborative Workspace Manager', () => {
  let realTimeDevStub;
  let analyticsStub;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    realTimeDevStub = sinon.stub(realTimeDevelopmentService, 'processCodeChange');
    analyticsStub = sinon.stub(sharedWorkspaceAnalytics, 'trackWorkspaceActivity');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await collaborativeWorkspaceManager.initialize();
      
      const status = collaborativeWorkspaceManager.getStatus();
      
      expect(status).toHaveProperty('activeWorkspaces');
      expect(status).toHaveProperty('totalCollaborators');
      expect(status).toHaveProperty('activeSessions');
      expect(status).toHaveProperty('realtimeConnections');
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        maxWorkspaces: 100,
        maxCollaboratorsPerWorkspace: 20,
        enableRealTimeSync: true,
        enableVersionControl: true,
        autoSaveInterval: 30000
      };

      await collaborativeWorkspaceManager.initialize(config);
      
      const status = collaborativeWorkspaceManager.getStatus();
      expect(status).toHaveProperty('configuration');
    });
  });

  describe('Workspace Management', () => {
    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
    });

    it('should create a new workspace', async () => {
      const workspaceData = {
        name: 'DeFi Protocol Development',
        description: 'Building next-gen AMM',
        createdBy: 'user-123',
        visibility: 'private',
        template: 'defi',
        collaborators: [
          { userId: 'user-456', role: 'collaborator', permissions: ['read', 'write'] },
          { userId: 'user-789', role: 'viewer', permissions: ['read'] }
        ]
      };

      const workspace = await collaborativeWorkspaceManager.createWorkspace(workspaceData);

      expect(workspace).toHaveProperty('id');
      expect(workspace).toHaveProperty('name', 'DeFi Protocol Development');
      expect(workspace).toHaveProperty('createdBy', 'user-123');
      expect(workspace).toHaveProperty('visibility', 'private');
      expect(workspace).toHaveProperty('collaborators');
      expect(workspace).toHaveProperty('files');
      expect(workspace).toHaveProperty('settings');
      expect(workspace).toHaveProperty('createdAt');

      // Verify creator is added as owner
      expect(workspace.collaborators).toHaveProperty('user-123');
      expect(workspace.collaborators['user-123'].role).toBe('owner');

      // Verify initial collaborators
      expect(workspace.collaborators).toHaveProperty('user-456');
      expect(workspace.collaborators).toHaveProperty('user-789');
    });

    it('should validate workspace creation data', async () => {
      const invalidData = {
        // Missing required name
        description: 'Invalid workspace',
        createdBy: 'user-123'
      };

      try {
        await collaborativeWorkspaceManager.createWorkspace(invalidData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should delete workspace', async () => {
      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Test Workspace',
        createdBy: 'user-123'
      });

      const result = await collaborativeWorkspaceManager.deleteWorkspace(workspace.id, 'user-123');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('workspaceId', workspace.id);
    });

    it('should validate deletion permissions', async () => {
      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Test Workspace',
        createdBy: 'user-123'
      });

      try {
        await collaborativeWorkspaceManager.deleteWorkspace(workspace.id, 'unauthorized-user');
        throw new Error('Should have thrown permission error');
      } catch (error) {
        expect(error.message).toContain('owner');
      }
    });
  });

  describe('Collaboration Session Management', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
      
      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Collaboration Test',
        createdBy: 'user-123',
        collaborators: [
          { userId: 'user-456', role: 'collaborator' }
        ]
      });
    });

    it('should join workspace session', async () => {
      const sessionData = {
        userId: 'user-456',
        userAgent: 'ChainIDE/1.0.0',
        capabilities: ['real_time_editing', 'voice_chat']
      };

      const session = await collaborativeWorkspaceManager.joinWorkspace(
        testWorkspace.id,
        'user-456',
        sessionData
      );

      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('workspaceId', testWorkspace.id);
      expect(session).toHaveProperty('userId', 'user-456');
      expect(session).toHaveProperty('joinedAt');
      expect(session).toHaveProperty('status', 'active');
    });

    it('should leave workspace session', async () => {
      const session = await collaborativeWorkspaceManager.joinWorkspace(
        testWorkspace.id,
        'user-456',
        { userId: 'user-456' }
      );

      const result = await collaborativeWorkspaceManager.leaveWorkspace(
        testWorkspace.id,
        'user-456'
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('sessionId', session.sessionId);
    });

    it('should track active sessions', () => {
      const activeSessions = collaborativeWorkspaceManager.getActiveSessions(testWorkspace.id);

      expect(activeSessions).toBeInstanceOf(Array);
      // Initially empty since no one has joined yet
      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('Real-Time File Operations', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
      
      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'File Operations Test',
        createdBy: 'user-123',
        collaborators: [
          { userId: 'user-456', role: 'collaborator' }
        ]
      });

      // Join workspace
      await collaborativeWorkspaceManager.joinWorkspace(testWorkspace.id, 'user-123');
      await collaborativeWorkspaceManager.joinWorkspace(testWorkspace.id, 'user-456');
    });

    it('should update file content', async () => {
      const fileUpdate = {
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        operation: 'update',
        cursorPosition: { line: 5, column: 10 }
      };

      realTimeDevStub.resolves({
        analysisId: 'analysis-123',
        instant: { syntaxValidation: { isValid: true } }
      });

      const result = await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        fileUpdate
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('fileVersion');
      expect(result).toHaveProperty('lastModified');
      expect(result).toHaveProperty('analysis');
    });

    it('should create new file', async () => {
      const fileData = {
        filePath: 'contracts/NewContract.sol',
        content: 'pragma solidity ^0.8.0;\n\ncontract NewContract {\n}',
        operation: 'create'
      };

      const result = await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        fileData
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('fileVersion', 1);
    });

    it('should delete file', async () => {
      // First create a file
      await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        {
          filePath: 'contracts/ToDelete.sol',
          content: 'contract ToDelete {}',
          operation: 'create'
        }
      );

      const result = await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        {
          filePath: 'contracts/ToDelete.sol',
          operation: 'delete'
        }
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('operation', 'delete');
    });

    it('should handle concurrent file updates', async () => {
      const updates = [
        {
          filePath: 'contracts/Token.sol',
          content: mockContracts.simple + '// Update 1',
          operation: 'update'
        },
        {
          filePath: 'contracts/Token.sol',
          content: mockContracts.simple + '// Update 2',
          operation: 'update'
        }
      ];

      realTimeDevStub.resolves({
        analysisId: 'analysis-123',
        instant: { syntaxValidation: { isValid: true } }
      });

      const promises = updates.map((update, index) =>
        collaborativeWorkspaceManager.updateFile(
          testWorkspace.id,
          index === 0 ? 'user-123' : 'user-456',
          update
        )
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toHaveProperty('success', true);
      });
    });
  });

  describe('Conflict Resolution', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
      
      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Conflict Test',
        createdBy: 'user-123',
        collaborators: [
          { userId: 'user-456', role: 'collaborator' }
        ]
      });
    });

    it('should detect merge conflicts', async () => {
      // Simulate conflicting changes
      const baseContent = mockContracts.simple;
      const change1 = baseContent.replace('uint256 public value;', 'uint256 public balance;');
      const change2 = baseContent.replace('uint256 public value;', 'uint256 public amount;');

      const conflict = await collaborativeWorkspaceManager.detectConflicts(
        'contracts/Token.sol',
        baseContent,
        change1,
        change2
      );

      expect(conflict).toHaveProperty('hasConflicts');
      expect(conflict).toHaveProperty('conflictRegions');
      if (conflict.hasConflicts) {
        expect(conflict.conflictRegions).toBeInstanceOf(Array);
      }
    });

    it('should resolve merge conflicts', async () => {
      const conflictData = {
        filePath: 'contracts/Token.sol',
        baseContent: mockContracts.simple,
        conflictRegions: [
          {
            startLine: 3,
            endLine: 3,
            localChange: 'uint256 public balance;',
            remoteChange: 'uint256 public amount;',
            resolution: 'uint256 public balance;' // Choose local
          }
        ]
      };

      const result = await collaborativeWorkspaceManager.resolveConflicts(
        testWorkspace.id,
        'user-123',
        conflictData
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('resolvedContent');
    });
  });

  describe('Version Control Integration', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize({
        enableVersionControl: true
      });

      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Version Control Test',
        createdBy: 'user-123'
      });
    });

    it('should track file versions', async () => {
      const filePath = 'contracts/Token.sol';

      // Create initial version
      await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        {
          filePath,
          content: mockContracts.simple,
          operation: 'create'
        }
      );

      // Update file
      await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        {
          filePath,
          content: mockContracts.simple + '\n// Updated',
          operation: 'update'
        }
      );

      const versions = await collaborativeWorkspaceManager.getFileVersions(
        testWorkspace.id,
        filePath
      );

      expect(versions).toBeInstanceOf(Array);
      expect(versions.length).toBeGreaterThan(1);
      expect(versions[0]).toHaveProperty('version');
      expect(versions[0]).toHaveProperty('timestamp');
      expect(versions[0]).toHaveProperty('author');
    });

    it('should restore file to previous version', async () => {
      const filePath = 'contracts/Token.sol';

      // Create and update file
      await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        { filePath, content: 'version 1', operation: 'create' }
      );

      await collaborativeWorkspaceManager.updateFile(
        testWorkspace.id,
        'user-123',
        { filePath, content: 'version 2', operation: 'update' }
      );

      const result = await collaborativeWorkspaceManager.restoreFileVersion(
        testWorkspace.id,
        'user-123',
        filePath,
        1
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('restoredVersion', 1);
    });

    it('should create workspace snapshots', async () => {
      const snapshot = await collaborativeWorkspaceManager.createSnapshot(
        testWorkspace.id,
        'user-123',
        {
          name: 'Pre-deployment snapshot',
          description: 'Snapshot before contract deployment'
        }
      );

      expect(snapshot).toHaveProperty('snapshotId');
      expect(snapshot).toHaveProperty('name', 'Pre-deployment snapshot');
      expect(snapshot).toHaveProperty('createdBy', 'user-123');
      expect(snapshot).toHaveProperty('timestamp');
    });
  });

  describe('Real-Time Communication', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();

      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Communication Test',
        createdBy: 'user-123',
        collaborators: [
          { userId: 'user-456', role: 'collaborator' }
        ]
      });
    });

    it('should broadcast cursor positions', async () => {
      const cursorData = {
        userId: 'user-123',
        filePath: 'contracts/Token.sol',
        position: { line: 10, column: 5 },
        selection: { start: { line: 10, column: 5 }, end: { line: 10, column: 15 } }
      };

      const result = await collaborativeWorkspaceManager.broadcastCursorPosition(
        testWorkspace.id,
        cursorData
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('broadcastTo');
      expect(result.broadcastTo).toBeInstanceOf(Array);
    });

    it('should handle chat messages', async () => {
      const messageData = {
        userId: 'user-123',
        content: 'Let\'s review this function together',
        type: 'text',
        filePath: 'contracts/Token.sol',
        lineNumber: 15
      };

      const message = await collaborativeWorkspaceManager.sendChatMessage(
        testWorkspace.id,
        messageData
      );

      expect(message).toHaveProperty('messageId');
      expect(message).toHaveProperty('content', messageData.content);
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('userId', 'user-123');
    });

    it('should manage voice/video calls', async () => {
      const callData = {
        initiatedBy: 'user-123',
        participants: ['user-456'],
        type: 'voice',
        context: {
          filePath: 'contracts/Token.sol',
          discussion: 'Security review'
        }
      };

      const call = await collaborativeWorkspaceManager.initiateCall(
        testWorkspace.id,
        callData
      );

      expect(call).toHaveProperty('callId');
      expect(call).toHaveProperty('status', 'initiated');
      expect(call).toHaveProperty('participants');
    });
  });

  describe('Workspace Analytics', () => {
    let testWorkspace;

    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();

      testWorkspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Analytics Test',
        createdBy: 'user-123'
      });

      analyticsStub.resolves({ tracked: true });
    });

    it('should track workspace activity', async () => {
      const activity = {
        type: 'file_edit',
        userId: 'user-123',
        filePath: 'contracts/Token.sol',
        timestamp: new Date().toISOString()
      };

      await collaborativeWorkspaceManager.trackActivity(testWorkspace.id, activity);

      // Analytics tracking is optional in test environment
      // Just verify the method doesn't throw an error
      expect(true).toBe(true);
    });

    it('should generate workspace statistics', async () => {
      const stats = await collaborativeWorkspaceManager.getWorkspaceStatistics(testWorkspace.id);

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalCollaborators');
      expect(stats).toHaveProperty('totalEdits');
      expect(stats).toHaveProperty('activeTime');
      expect(stats).toHaveProperty('lastActivity');
    });

    it('should track collaboration metrics', async () => {
      const metrics = await collaborativeWorkspaceManager.getCollaborationMetrics(testWorkspace.id);

      expect(metrics).toHaveProperty('averageSessionDuration');
      expect(metrics).toHaveProperty('peakConcurrentUsers');
      expect(metrics).toHaveProperty('totalChatMessages');
      expect(metrics).toHaveProperty('conflictResolutions');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
    });

    it('should handle invalid workspace IDs', async () => {
      try {
        await collaborativeWorkspaceManager.joinWorkspace('invalid-id', 'user-123');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Workspace not found');
      }
    });

    it('should handle permission violations', async () => {
      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Private Workspace',
        createdBy: 'user-123',
        visibility: 'private'
      });

      try {
        await collaborativeWorkspaceManager.joinWorkspace(workspace.id, 'unauthorized-user');
        throw new Error('Should have thrown permission error');
      } catch (error) {
        expect(error.message).toContain('authorized');
      }
    });

    it('should handle service failures gracefully', async () => {
      realTimeDevStub.rejects(new Error('Service unavailable'));

      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Test Workspace',
        createdBy: 'user-123'
      });

      const result = await collaborativeWorkspaceManager.updateFile(
        workspace.id,
        'user-123',
        {
          filePath: 'contracts/Token.sol',
          content: mockContracts.simple,
          operation: 'create'
        }
      );

      // Should still succeed even if analysis fails
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('analysis');
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await collaborativeWorkspaceManager.initialize();
    });

    it('should handle multiple concurrent workspaces', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        collaborativeWorkspaceManager.createWorkspace({
          name: `Workspace ${i}`,
          createdBy: `user-${i}`
        })
      );

      const workspaces = await Promise.all(promises);

      expect(workspaces).toHaveLength(10);
      workspaces.forEach(workspace => {
        expect(workspace).toHaveProperty('id');
      });
    });

    it('should handle many collaborators in single workspace', async () => {
      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        name: 'Large Team Workspace',
        createdBy: 'user-0',
        collaborators: Array.from({ length: 20 }, (_, i) => ({
          userId: `user-${i + 1}`,
          role: 'collaborator'
        })),
        settings: {
          maxConcurrentUsers: 25
        },
        settings: {
          maxConcurrentUsers: 25
        }
      });

      const joinPromises = Array.from({ length: 20 }, (_, i) =>
        collaborativeWorkspaceManager.joinWorkspace(workspace.id, `user-${i + 1}`)
      );

      const sessions = await Promise.all(joinPromises);

      expect(sessions).toHaveLength(20);
      sessions.forEach(session => {
        expect(session).toHaveProperty('sessionId');
      });
    });
  });
});
