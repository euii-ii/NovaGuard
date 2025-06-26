const { runFullAudit } = require('../services/aiOrchestrator');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// POST /api/contracts/upload
async function uploadContract(req, res) {
  const { contract_address, contract_code, protocol_type, chain_id } = req.body;
  const { data, error } = await supabase.from('contracts').insert({
    contract_address,
    contract_code,
    protocol_type,
    chain_id
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}

// POST /api/contracts/:id/scan
async function scanContract(req, res) {
  const contractId = req.params.id;
  const { data: contract, error } = await supabase.from('contracts').select('*').eq('id', contractId).single();
  if (error || !contract) return res.status(404).json({ error: 'Contract not found' });
  const results = await runFullAudit(contract);
  res.json(results);
}

// GET /api/contracts/:id/results
async function getAuditResults(req, res) {
  const contractId = req.params.id;
  const { data, error } = await supabase.from('audit_results').select('*').eq('contract_id', contractId).order('analysis_time', { ascending: false }).limit(1).single();
  if (error || !data) return res.status(404).json({ error: 'No results found' });
  res.json(data);
}

module.exports = {
  uploadContract,
  scanContract,
  getAuditResults
};
