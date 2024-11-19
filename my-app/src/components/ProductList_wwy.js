import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Spin, message, Button, InputNumber, Pagination, Input } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { web3, MarketplaceContract } from '../contract/contractUtils';

const { Title } = Typography;
const { Search } = Input;

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [quantity, setQuantity] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountAndProducts = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);

      fetchProducts();
      fetchFavorites(accounts[0]);
    };

    fetchAccountAndProducts();

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0]);
      fetchProducts();
      fetchFavorites(accounts[0]);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const fetchProducts = async (term = '', min = null, max = null) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search: term });
      if (min !== null) query.append('minPrice', min);
      if (max !== null) query.append('maxPrice', max);

      const response = await fetch(`http://localhost:5000/products?${query.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        message.error('无法获取商品列表');
      }
    } catch (error) {
      console.error('获取商品列表错误:', error);
      message.error('获取商品列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async (account) => {
    try {
      const response = await fetch(`http://localhost:5000/favorites?user=${account}`);
      if (response.ok) {
        const data = await response.json();
        setFavorites(new Set(data.map(item => item.id)));
      } else {
        message.error('无法获取收藏列表');
      }
    } catch (error) {
      console.error('获取收藏列表错误:', error);
      message.error('获取收藏列表失败，请重试');
    }
  };

  const handleQuantityChange = (value, productId) => {
    setQuantity(prev => ({ ...prev, [productId]: value }));
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
            name: products.find(product => product.id === productId).name,
            price: price,
            quantity: purchaseQuantity,
            transactionHash,
            buyer: account,
            seller: products.find(product => product.id === productId).owner
          })
        });

        if (orderResponse.ok) {
          message.success('订单信息保存成功');
        } else {
          message.error('订单信息保存失败');
        }

        message.success('商品数量更新成功');
        setProducts(products.map(product =>
          product.id === productId ? { ...product, quantity: product.quantity - purchaseQuantity } : product
        ));
        window.location.reload();
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

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    fetchProducts(value, minPrice, maxPrice);
  };

  const handlePriceFilter = () => {
    fetchProducts(searchTerm, minPrice, maxPrice);
  };

  const handleFavoriteToggle = async (productId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
      await fetch(`http://localhost:5000/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: account, productId })
      });
      message.success('已取消收藏');
    } else {
      newFavorites.add(productId);
      await fetch(`http://localhost:5000/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: account, productId })
      });
      message.success('已添加收藏');
    }
    setFavorites(newFavorites);
  };

  const paginatedProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20%' }} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ textAlign: 'center' }}>商品列表</Title>
      <Search
        placeholder="输入关键字搜索"
        onSearch={handleSearch}
        enterButton
        style={{ marginBottom: '20px' }}
      />
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <InputNumber
          placeholder="最低价格"
          value={minPrice}
          onChange={setMinPrice}
          style={{ marginRight: '10px' }}
        />
        <InputNumber
          placeholder="最高价格"
          value={maxPrice}
          onChange={setMaxPrice}
          style={{ marginRight: '10px' }}
        />
        <Button type="primary" onClick={handlePriceFilter}>筛选</Button>
      </div>
      <List
        grid={{ gutter: 16, column: 4 }}
        dataSource={paginatedProducts}
        renderItem={item => (
          <List.Item key={item.id}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.name}
                  {favorites.has(item.id) ? 
                    <HeartFilled onClick={() => handleFavoriteToggle(item.id)} style={{ color: 'red' }} /> : 
                    <HeartOutlined onClick={() => handleFavoriteToggle(item.id)} />
                  }
                </div>
              }
              cover={
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img
                    alt={item.name}
                    src={`https://gateway.pinata.cloud/ipfs/${item.imageHash}`}
                    style={{ width: '100%', height: 'auto', cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${item.id}`)} // 添加点击事件
                  />
                  {item.quantity === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: 'red'
                    }}>
                      已经卖光
                    </div>
                  )}
                </div>
              }
            >
              <p>商品描述: {item.description}</p>            
              <p>价格: {item.price} WWY</p>
              <p>数量: {item.quantity}</p>
              <InputNumber
                min={1}
                max={item.quantity}
                defaultValue={1}
                onChange={value => handleQuantityChange(value, item.id)}
                disabled={item.quantity === 0}
              />
              <Button type="primary" onClick={() => handlePurchase(item.id, item.price)} style={{ marginTop: '10px' }} disabled={item.quantity === 0}>
                购买
              </Button>
            </Card>
          </List.Item>
        )}
      />
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={products.length}
        onChange={handlePageChange}
        style={{ textAlign: 'center', marginTop: '20px' }}
      />
    </div>
  );
};

export default ProductList;
