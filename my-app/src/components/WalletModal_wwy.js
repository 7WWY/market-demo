import React, { useEffect, useState } from 'react';
import { Modal, Input, Button, Typography, message } from 'antd';
import { web3, ERC20Contract, MarketplaceContract } from '../contract/contractUtils'; // 确保导入路径正确

const { Title } = Typography;

const WalletModal = ({ visible, onClose }) => {
  const [account, setAccount] = useState('');
  const [ethBalance, setEthBalance] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [tokenToEthAmount, setTokenToEthAmount] = useState('');

  useEffect(() => {
    const fetchAccountData = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);

      const ethBal = await web3.eth.getBalance(accounts[0]);
      setEthBalance(web3.utils.fromWei(ethBal, 'ether'));

      const tokenBal = await ERC20Contract.methods.balanceOf(accounts[0]).call();
      setTokenBalance(web3.utils.fromWei(tokenBal, 'wei')); 
    };

    fetchAccountData();

    window.ethereum.on('accountsChanged', async (accounts) => {
      setAccount(accounts[0]);

      const ethBal = await web3.eth.getBalance(accounts[0]);
      setEthBalance(web3.utils.fromWei(ethBal, 'ether'));

      const tokenBal = await ERC20Contract.methods.balanceOf(accounts[0]).call();
      setTokenBalance(web3.utils.fromWei(tokenBal, 'wei') );
    });

    return () => {
      window.ethereum.removeListener('accountsChanged', fetchAccountData);
    };
  }, []);

  const handleSwapEthToTokens = async () => {
    if (!swapAmount) {
      message.error('请输入交换金额');
      return;
    }

    const ethAmount = web3.utils.toWei(swapAmount, 'ether');

    try {
      await ERC20Contract.methods.swapTokensForEth().send({ from: account, value: ethAmount });
      message.success('代币转换成功');
      const ethBal = await web3.eth.getBalance(account);
      setEthBalance(web3.utils.fromWei(ethBal, 'ether'));

      const tokenBal = await ERC20Contract.methods.balanceOf(account).call();
      setTokenBalance(web3.utils.fromWei(tokenBal, 'wei'));
    } catch (error) {
      console.error('代币转换错误:', error);
      message.error('代币转换失败，请重试');
    }
  };

  const handleSwapTokensToEth = async () => {
    if (!tokenToEthAmount) {
      message.error('请输入转换的代币数量');
      return;
    }

    const tokenAmount = web3.utils.toWei(tokenToEthAmount, 'wei');

    try {
      await ERC20Contract.methods.transferEtherTo(tokenAmount).send({ from: account });
      message.success('ETH 转换成功');
      const ethBal = await web3.eth.getBalance(account);
      setEthBalance(web3.utils.fromWei(ethBal, 'ether'));

      const tokenBal = await ERC20Contract.methods.balanceOf(account).call();
      setTokenBalance(web3.utils.fromWei(tokenBal, 'wei')); 
    } catch (error) {
      console.error('ETH 转换错误:', error);
      message.error('ETH 转换失败，请重试');
    }
  };

  return (
    <Modal visible={visible} onCancel={onClose} footer={null} title="钱包">
      <Title level={4}>钱包信息</Title>
      <p>账户地址: {account}</p>
      <p>ETH 余额: {ethBalance} ETH</p>
      <p>WWYToken 余额: {tokenBalance} WWY</p>
      <Input
        type="number"
        placeholder="输入 ETH 数量"
        value={swapAmount}
        onChange={(e) => setSwapAmount(e.target.value)}
        style={{ marginBottom: '16px' }}
      />
      <Button type="primary" onClick={handleSwapEthToTokens} block>
        交换 ETH 到 WWYToken
      </Button>
      <Input
        type="number"
        placeholder="输入 WWY 数量"
        value={tokenToEthAmount}
        onChange={(e) => setTokenToEthAmount(e.target.value)}
        style={{ marginBottom: '16px', marginTop: '16px' }}
      />
      <Button type="primary" onClick={handleSwapTokensToEth} block>
        交换 WWYToken 到 ETH
      </Button>
    </Modal>
  );
};

export default WalletModal;
