/**
 * Mock for teamCollaborationService
 * Used in tests to simulate team collaboration functionality
 */

const mockTeamCollaborationService = {
  // Mock startCodeReview method
  startCodeReview: jest.fn().mockResolvedValue({
    id: 'review-session-123',
    teamId: 'team-456',
    createdBy: 'user-789',
    title: 'Security Audit Review',
    description: 'Please review the automated audit results',
    status: 'active',
    createdAt: new Date(),
    participants: []
  }),

  // Mock getReviewSession method
  getReviewSession: jest.fn().mockResolvedValue({
    id: 'review-session-123',
    teamId: 'team-456',
    status: 'active',
    comments: [],
    participants: []
  }),

  // Mock addReviewComment method
  addReviewComment: jest.fn().mockResolvedValue({
    id: 'comment-123',
    reviewSessionId: 'review-session-123',
    userId: 'user-789',
    content: 'This looks good',
    createdAt: new Date()
  }),

  // Mock completeReview method
  completeReview: jest.fn().mockResolvedValue({
    id: 'review-session-123',
    status: 'completed',
    completedAt: new Date()
  }),

  // Mock getTeamMembers method
  getTeamMembers: jest.fn().mockResolvedValue([
    { id: 'user-1', name: 'Alice', role: 'developer' },
    { id: 'user-2', name: 'Bob', role: 'security-expert' }
  ]),

  // Mock createTeam method
  createTeam: jest.fn().mockResolvedValue({
    id: 'team-456',
    name: 'Security Team',
    members: [],
    createdAt: new Date()
  }),

  // Mock startTeamAnalysis method
  startTeamAnalysis: jest.fn().mockResolvedValue({
    sessionId: 'analysis-session-123',
    teamId: 'team-123',
    status: 'active',
    createdAt: new Date(),
    participants: []
  })
};

module.exports = mockTeamCollaborationService;
