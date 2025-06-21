import React, { useState, useEffect } from 'react';
import { FaRocket, FaNetworkWired, FaGasPump, FaEye, FaHistory, FaWallet, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import deploymentService, { DeploymentConfig, DeploymentResult, NetworkConfig } from '../../services/DeploymentService';

interface DeploymentPanelProps {
  contractCode: string;
  contractName: string;
  isConnected: boolean;
  connectedWallet: 'metamask' | 'phantom' | null;
  onConnect: () => void;
}

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  contractCode,
  contractName,
  isConnected,
  connectedWallet,
  onConnect
}) => {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia');
  const [constructorArgs, setConstructorArgs] = useState<string>('');
  const [gasLimit, setGasLimit] = useState<string>('');
  const [gasPrice, setGasPrice] = useState<string>('');
  const [value, setValue] = useState<string>('0');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadNetworks();
    loadDeploymentHistory();
  }, []);

  const loadNetworks = async () => {
    try {
      const networkList = await deploymentService.getSupportedNetworks();
      setNetworks(networkList);
    } catch (error) {
      console.error('Failed to load networks:', error);
    }
  };

  const loadDeploymentHistory = async () => {
    try {
      const history = await deploymentService.getDeploymentHistory();
      setDeploymentHistory(history);
    } catch (error) {
      console.error('Failed to load deployment history:', error);
    }
  };

  const handleEstimateGas = async () => {
    if (!contractCode || !contractName) {
      alert('Please provide contract code and name');
      return;
    }

    setIsEstimating(true);
    try {
      const args = constructorArgs ? JSON.parse(constructorArgs) : [];
      const estimate = await deploymentService.estimateGas({
        contractName,
        contractCode,
        constructorArgs: args,
        network: selectedNetwork,
        value
      });
      setGasEstimate(estimate);
      setGasLimit(estimate.gasEstimate.toString());
      setGasPrice(estimate.gasPriceRecommendation);
    } catch (error: any) {
      alert(`Gas estimation failed: ${error.message}`);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      onConnect();
      return;
    }

    if (!contractCode || !contractName) {
      alert('Please provide contract code and name');
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      const args = constructorArgs ? JSON.parse(constructorArgs) : [];
      const config: DeploymentConfig = {
        contractName,
        contractCode,
        constructorArgs: args,
        network: selectedNetwork,
        gasLimit: gasLimit ? parseInt(gasLimit) : undefined,
        gasPrice,
        value
      };

      const result = await deploymentService.deployContract(config);
      setDeploymentResult(result);
      
      if (result.success) {
        await loadDeploymentHistory(); // Refresh history
      }
    } catch (error: any) {
      setDeploymentResult({
        success: false,
        error: error.message || 'Deployment failed'
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleVerifyContract = async () => {
    if (!deploymentResult?.contractAddress) return;

    try {
      const result = await deploymentService.verifyContract(
        deploymentResult.contractAddress,
        selectedNetwork,
        contractCode
      );
      
      if (result.success) {
        alert('Contract verification initiated. Check the explorer for status.');
        if (result.verificationUrl) {
          window.open(result.verificationUrl, '_blank');
        }
      } else {
        alert(`Verification failed: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Verification failed: ${error.message}`);
    }
  };

  const selectedNetworkConfig = networks.find(n => n.id === selectedNetwork);

  return (
    <div className="deployment-panel">
      <div className="panel-header">
        <FaRocket className="panel-icon" />
        <h3>Smart Contract Deployment</h3>
      </div>

      <div className="deployment-content">
        {/* Wallet Connection Status */}
        <div className="wallet-status">
          <div className="status-item">
            <FaWallet className="status-icon" />
            <span>Wallet: </span>
            {isConnected ? (
              <span className="connected">{connectedWallet} Connected</span>
            ) : (
              <button className="connect-btn" onClick={onConnect}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Network Selection */}
        <div className="form-group">
          <label>
            <FaNetworkWired className="label-icon" />
            Target Network
          </label>
          <select 
            value={selectedNetwork} 
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="network-select"
          >
            {networks.map(network => (
              <option key={network.id} value={network.id}>
                {network.name} {network.testnet ? '(Testnet)' : ''}
              </option>
            ))}
          </select>
          {selectedNetworkConfig && (
            <div className="network-info">
              <span>Chain ID: {selectedNetworkConfig.chainId}</span>
              <span>Currency: {selectedNetworkConfig.currency}</span>
            </div>
          )}
        </div>

        {/* Contract Details */}
        <div className="form-group">
          <label>Contract Name</label>
          <input 
            type="text" 
            value={contractName} 
            readOnly
            className="contract-name-input"
          />
        </div>

        {/* Constructor Arguments */}
        <div className="form-group">
          <label>Constructor Arguments (JSON Array)</label>
          <textarea
            value={constructorArgs}
            onChange={(e) => setConstructorArgs(e.target.value)}
            placeholder='["arg1", "arg2", 123]'
            className="constructor-args"
            rows={3}
          />
        </div>

        {/* Gas Configuration */}
        <div className="gas-section">
          <div className="section-header">
            <FaGasPump className="section-icon" />
            <span>Gas Configuration</span>
            <button 
              className="estimate-btn"
              onClick={handleEstimateGas}
              disabled={isEstimating}
            >
              {isEstimating ? <FaSpinner className="spinning" /> : 'Estimate'}
            </button>
          </div>

          {gasEstimate && (
            <div className="gas-estimate">
              <div className="estimate-item">
                <span>Estimated Gas: {gasEstimate.gasEstimate.toLocaleString()}</span>
              </div>
              <div className="estimate-item">
                <span>Recommended Gas Price: {gasEstimate.gasPriceRecommendation} Gwei</span>
              </div>
              <div className="estimate-item">
                <span>Estimated Cost: {gasEstimate.estimatedCost} {selectedNetworkConfig?.currency}</span>
              </div>
            </div>
          )}

          <div className="gas-inputs">
            <div className="form-group">
              <label>Gas Limit</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                placeholder="Auto"
              />
            </div>
            <div className="form-group">
              <label>Gas Price (Gwei)</label>
              <input
                type="text"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                placeholder="Auto"
              />
            </div>
          </div>
        </div>

        {/* Value to Send */}
        <div className="form-group">
          <label>Value to Send ({selectedNetworkConfig?.currency || 'ETH'})</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Deploy Button */}
        <button 
          className="deploy-btn"
          onClick={handleDeploy}
          disabled={isDeploying || !contractCode}
        >
          {isDeploying ? (
            <>
              <FaSpinner className="spinning" />
              Deploying...
            </>
          ) : (
            <>
              <FaRocket />
              Deploy Contract
            </>
          )}
        </button>

        {/* Deployment Result */}
        {deploymentResult && (
          <div className={`deployment-result ${deploymentResult.success ? 'success' : 'error'}`}>
            <div className="result-header">
              {deploymentResult.success ? (
                <FaCheckCircle className="success-icon" />
              ) : (
                <FaExclamationTriangle className="error-icon" />
              )}
              <span>{deploymentResult.success ? 'Deployment Successful!' : 'Deployment Failed'}</span>
            </div>

            {deploymentResult.success ? (
              <div className="success-details">
                <div className="detail-item">
                  <strong>Contract Address:</strong>
                  <span className="address">{deploymentResult.contractAddress}</span>
                </div>
                <div className="detail-item">
                  <strong>Transaction Hash:</strong>
                  <span className="hash">{deploymentResult.transactionHash}</span>
                </div>
                {deploymentResult.gasUsed && (
                  <div className="detail-item">
                    <strong>Gas Used:</strong>
                    <span>{deploymentResult.gasUsed.toLocaleString()}</span>
                  </div>
                )}
                <div className="result-actions">
                  {deploymentResult.explorerUrl && (
                    <button 
                      className="explorer-btn"
                      onClick={() => window.open(deploymentResult.explorerUrl, '_blank')}
                    >
                      <FaEye />
                      View on Explorer
                    </button>
                  )}
                  <button 
                    className="verify-btn"
                    onClick={handleVerifyContract}
                  >
                    Verify Contract
                  </button>
                </div>
              </div>
            ) : (
              <div className="error-details">
                <p>{deploymentResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Deployment History */}
        <div className="history-section">
          <button 
            className="history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            <FaHistory />
            Deployment History ({deploymentHistory.length})
          </button>

          {showHistory && (
            <div className="history-list">
              {deploymentHistory.length === 0 ? (
                <p>No deployments yet</p>
              ) : (
                deploymentHistory.map(deployment => (
                  <div key={deployment.id} className="history-item">
                    <div className="history-header">
                      <span className="contract-name">{deployment.contractName}</span>
                      <span className={`status ${deployment.status}`}>{deployment.status}</span>
                    </div>
                    <div className="history-details">
                      <span>Network: {deployment.network}</span>
                      <span>Address: {deployment.contractAddress}</span>
                      <span>Date: {new Date(deployment.deployedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPanel;
