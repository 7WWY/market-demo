import React, { useState, useEffect } from 'react';
import { List, Card, Typography, message, Spin, Pagination } from 'antd';
import { web3 } from '../contract/contractUtils';

const { Title } = Typography;

const MyReviews = () => {
  const [account, setAccount] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3); // 每页显示的评论数

  useEffect(() => {
    const fetchAccountAndReviews = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);

      fetchReviews(accounts[0]);

      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        fetchReviews(accounts[0]);
      });
    };

    fetchAccountAndReviews();

    // 清理账户更改事件监听器
    return () => {
      window.ethereum.removeListener('accountsChanged', fetchAccountAndReviews);
    };
  }, []);

  const fetchReviews = async (account) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/reviews?reviewer=${account}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        message.error('无法获取评论列表');
      }
    } catch (error) {
      console.error('获取评论列表错误:', error);
      message.error('获取评论列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20%' }} />;
  }

  const paginatedReviews = reviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ textAlign: 'center' }}>我的评论</Title>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={paginatedReviews}
        renderItem={item => (
          <List.Item key={item.id}>
            <Card title={`评论商品 名称: ${item.name}`}>
              <p>内容: {item.content}</p>
              {item.image && <img src={`https://gateway.pinata.cloud/ipfs/${item.image}`} alt="评论图片" style={{ maxWidth: '100%', maxHeight: '300px' }} />}
              <p>时间: {new Date(item.timestamp).toLocaleString()}</p>
              {item.reply && (
                <div style={{ marginTop: '20px', padding: '10px', borderTop: '1px solid #e8e8e8' }}>
                  <p><strong>商家回复:</strong></p>
                  <p>{item.reply}</p>
                  <p>回复时间: {new Date(item.replyTimestamp).toLocaleString()}</p>
                </div>
              )}
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

export default MyReviews;
