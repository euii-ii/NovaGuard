module.exports = {
  parseContract: jest.fn().mockResolvedValue({
    contracts: [],
    functions: [],
    modifiers: [],
    events: [],
    codeMetrics: {
      codeLines: 10,
      complexity: 1,
      functionCount: 0,
      modifierCount: 0,
      eventCount: 0
    },
    staticAnalysis: {
      findings: []
    }
  }),
  
  getStatus: jest.fn().mockReturnValue({
    initialized: true,
    parsedContracts: 0
  })
};