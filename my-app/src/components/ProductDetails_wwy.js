import React, { useState, useEffect } from 'react';
import { Typography, Spin, List, Card, message, Divider, Button, Pagination } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { web3, MarketplaceContract } from '../contract/contractUtils'; // 导入 web3 和智能合约工具
import './ProductDetail_wwy.css'; // 导入 CSS 文件

const { Title, Text } = Typography;

const ProductDetail = () => {
  const { id } = useParams(); // 获取URL参数中的产品ID
  const [product, setProduct] = useState(null); // 存储产品详情
  const [transactions, setTransactions] = useState([]); // 存储产品交易记录
  const [reviews, setReviews] = useState([]); // 存储产品评论
  const [loading, setLoading] = useState(true); // 控制加载状态
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [pageSize, setPageSize] = useState(2); // 每页显示的记录数
  const navigate = useNavigate(); // 使用 useNavigate 进行导航

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product); // 设置产品详情
          setTransactions(data.transactions); // 设置交易记录
          setReviews(data.reviews); // 设置评论
        } else {
          message.error('获取商品详情失败');
        }
      } catch (error) {
        console.error('获取商品详情错误:', error);
        message.error('获取商品详情失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);
  const paginatedReviews = reviews.slice(startIndex, endIndex);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20%' }} />;
  }

  if (!product) {
    return <div>商品未找到</div>;
  }

  return (
    <div className="product-detail-container">
      <Button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>返回</Button>
      <Card className="product-card">
        <Title level={2} className="product-title">{product.name}</Title>
        <img
          alt={product.name}
          src={`https://gateway.pinata.cloud/ipfs/${product.imageHash}`}
          className="product-image"
        />
        <p><Text strong>描述:</Text> {product.description}</p>
        <p><Text strong>价格:</Text> {product.price} WWY</p>
        <p><Text strong>数量:</Text> {product.quantity}</p>
      </Card>

      <Divider />

      <Title level={4} className="transaction-title">交易记录</Title>
      <List
        itemLayout="vertical"
        dataSource={paginatedTransactions}
        renderItem={item => (
          <List.Item key={item.txHash} className="transaction-item">
            <Card title={`交易哈希: ${item.txHash}`} className="transaction-card">
              <p><Text strong>买家:</Text> {item.buyer}</p>
              <p><Text strong>数量:</Text> {item.quantity}</p>
              <p><Text strong>区块哈希:</Text> {item.blockHash}</p>
              <p><Text strong>区块号:</Text> {item.blockNumber}</p>
              <p><Text strong>时间戳:</Text> {new Date(item.timestamp * 1000).toLocaleString()}</p>
            </Card>
          </List.Item>
        )}
      />

      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={transactions.length}
        onChange={handlePageChange}
        style={{ textAlign: 'center', marginTop: '20px' }}
      />

      <Divider />

      <Title level={4} className="review-title">用户评论</Title>
      <List
        itemLayout="vertical"
        dataSource={paginatedReviews}
        renderItem={item => (
          <List.Item key={item.id} className="review-item">
            <Card title={`评论ID: ${item.id}`} className="review-card">
              <p><Text strong>评论者:</Text> {item.reviewer}</p>
              <p><Text strong>评论内容:</Text> {item.content}</p>
              {item.image && <img src={`https://gateway.pinata.cloud/ipfs/${item.image}`} alt="评论图片" style={{ maxWidth: '100%', maxHeight: '300px' }} />}
              <p><Text strong>评论时间:</Text> {new Date(item.timestamp).toLocaleString()}</p>
              <p><Text strong>商家回复:</Text> {item.reply || '暂无回复'}</p>
            </Card>
          </List.Item>
        )}
      />

      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={reviews.length}
        onChange={handlePageChange}
        style={{ textAlign: 'center', marginTop: '20px' }}
      />
    </div>
  );
};

export default ProductDetail;
