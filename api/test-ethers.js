// Test if ethers can be imported
try {
  const { ethers } = require('ethers');
  console.log('✅ Ethers imported successfully');
  console.log('Ethers version:', ethers.version);
  
  // Test basic functionality
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
  console.log('✅ Provider created successfully');
  
  // Test wallet creation
  const wallet = ethers.Wallet.createRandom();
  console.log('✅ Wallet created successfully');
  console.log('Wallet address:', wallet.address);
  
} catch (error) {
  console.error('❌ Error importing ethers:', error.message);
  console.error('Stack:', error.stack);
}
