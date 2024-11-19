import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Spin, message, Button, Pagination, InputNumber, Row, Col, Divider, Badge } from 'antd';
import { useNavigate } from 'react-router-dom';
import { web3, MarketplaceContract } from '../contract/contractUtils';
import { ShoppingCartOutlined, HeartFilled } from '@ant-design/icons';

const { Title } = Typography;

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [quantity, setQuantity] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountAndFavorites = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);

      fetchFavorites(accounts[0]);
    };

    fetchAccountAndFavorites();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        fetchFavorites(accounts[0]);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const fetchFavorites = async (user) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/favorites?user=${user}`);
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      } else {
        message.error('无法获取收藏列表');
      }
    } catch (error) {
      console.error('获取收藏列表错误:', error);
      message.error('获取收藏列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId) => {
    try {
      const response = await fetch(`http://localhost:5000/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: account, productId })
      });
      if (response.ok) {
        message.success('已取消收藏');
        setFavorites(favorites.filter(fav => fav.id !== productId));
      } else {
        message.error('取消收藏失败');
      }
    } catch (error) {
      console.error('取消收藏错误:', error);
      message.error('取消收藏失败，请重试');
    }
  };

  const handlePurchase = async (productId, price) => {
    const purchaseQuantity = quantity[productId] || 1;
    try {
      const transaction = await MarketplaceContract.methods.purchaseProduct(productId, purchaseQuantity).send({ from: account });

      const { transactionHash, blockHash, blockNumber } = transaction;

      message.success('购买成功');

      const response = await fetch(`http://localhost:5000/updateProductQuantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          purchaseQuantity,
          transactionHash,
          blockHash,
          blockNumber: blockNumber.toString(),
          buyer: account
        })
      });

      if (response.ok) {
        const orderResponse = await fetch('http://localhost:5000/orders/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId,
            name: favorites.find(product => product.id === productId).name,
            price: price,
            quantity: purchaseQuantity,
            transactionHash,
            buyer: account,
            seller: favorites.find(product => product.id === productId).owner          
          })
        });

        if (orderResponse.ok) {
          message.success('订单信息保存成功');
        } else {
          message.error('订单信息保存失败');
        }

        message.success('商品数量更新成功');
        setFavorites(favorites.map(product =>
          product.id === productId ? { ...product, quantity: product.quantity - purchaseQuantity } : product
        ));
      } else {
        message.error('更新商品数量失败');
      }
    } catch (error) {
      if (error.code === 4001) {
        message.error('用户拒绝了交易签名');
      } else {
        console.error('购买错误:', error);
        message.error('购买失败，请重试');
      }
    }
  };

  const handleQuantityChange = (value, productId) => {
    setQuantity(prev => ({ ...prev, [productId]: value }));
  };

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const paginatedFavorites = favorites.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20%' }} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
        收藏列表 <Badge count={favorites.length} style={{ backgroundColor: '#52c41a' }} />
      </Title>
      <Row gutter={[16, 16]}>
        {paginatedFavorites.map(item => (
          <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              cover={
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    alt={item.name}
                    src={`https://gateway.pinata.cloud/ipfs/${item.imageHash}`}
                    style={{ width: '100%', height: 'auto', cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${item.id}`)}
                  />
                </div>
              }
              actions={[
                <Button
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  onClick={() => handlePurchase(item.id, item.price)}
                  disabled={item.quantity === 0}
                >
                  购买
                </Button>,
                <Button
                  type="default"
                  icon={<HeartFilled />}
                  danger
                  onClick={() => handleRemoveFavorite(item.id)}
                >
                  取消收藏
                </Button>
              ]}
            >
              <Card.Meta
                title={item.name}
                description={
                  <>
                    <p>商品描述: {item.description}</p>
                    <p>价格: {item.price} WWY</p>
                    <p>数量: {item.quantity}</p>
                    <InputNumber
                      min={1}
                      max={item.quantity}
                      defaultValue={1}
                      onChange={value => handleQuantityChange(value, item.id)}
                      disabled={item.quantity === 0}
                      style={{ width: '100%' }}
                    />
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Divider />
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={favorites.length}
        onChange={handlePageChange}
        showSizeChanger
        style={{ textAlign: 'center', marginTop: '20px' }}
      />
    </div>
  );
};

export default FavoritesList;
