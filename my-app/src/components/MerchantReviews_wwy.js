import React, { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Form, Input, message, Pagination, Spin } from 'antd';
import { web3, MarketplaceContract } from "../contract/contractUtils";

const { TextArea } = Input;

const MerchantReviews = () => {
  const [account, setAccount] = useState('');
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1);

  useEffect(() => {
    const fetchAccountAndOrders = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);

      fetchOrders(accounts[0]);

      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        fetchOrders(accounts[0]);
      });
    };

    fetchAccountAndOrders();

    return () => {
      window.ethereum.removeListener('accountsChanged', fetchAccountAndOrders);
    };
  }, []);

  const fetchOrders = async (merchant) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/merchant/orders?merchant=${merchant}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setReviews(data.reviews);
      } else {
        message.error('无法获取订单和评论列表');
      }
    } catch (error) {
      console.error('获取订单和评论列表错误:', error);
      message.error('获取订单和评论列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (review) => {
    setCurrentReview(review);
    setReplyModalVisible(true);
  };

  const handleReplySubmit = async (values) => {
    await MarketplaceContract.methods.replyReview(currentReview.id, values.reply).send({ from: account, gas: '5000000' });
    try {
      await fetch('http://localhost:5000/reviews/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewId: currentReview.id,
          reply: values.reply
        })
      });

      message.success('回复提交成功');
      setReplyModalVisible(false);
      fetchOrders(account); // 刷新评论列表
    } catch (error) {
      console.error('提交回复错误:', error);
      message.error('提交回复失败');
    }
  };

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20%' }} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={paginatedOrders}
        renderItem={order => (
          <List.Item key={order.id}>
            <Card title={`订单ID: ${order.id}`}>
              <p>商品名称: {order.name}</p>
              <p>价格: {order.price} WWY</p>
              <p>数量: {order.quantity}</p>
              <p>买家: {order.buyer}</p>
              <p>交易哈希: {order.txHash}</p>
              {reviews.filter(review => review.productId === order.productId && review.reviewer === order.buyer && review.txHash === order.txHash).length > 0 ? (
                <List
                  dataSource={reviews.filter(review => review.productId === order.productId && review.reviewer === order.buyer && review.txHash === order.txHash)}
                  renderItem={review => (
                    <Card type="inner" title={`评论ID: ${review.id}`} key={review.id}>
                      <p>评论内容: {review.content}</p>
                      {review.image && <img src={`https://gateway.pinata.cloud/ipfs/${review.image}`} alt="评论图片" style={{ maxWidth: '100%', maxHeight: '300px' }} />}
                      <p>评论者: {review.reviewer}</p>
                      <p>评论时间: {new Date(review.timestamp).toLocaleString()}</p>
                      <p>商家回复: {review.reply || '暂无回复'}</p>
                      <Button type="primary" onClick={() => handleReply(review)}>回复</Button>
                    </Card>
                  )}
                />
              ) : (
                <p>暂无评论</p>
              )}
            </Card>
          </List.Item>
        )}
      />
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={orders.length}
        onChange={handlePageChange}
        style={{ textAlign: 'center', marginTop: '20px' }}
      />

      <Modal
        title="回复评论"
        visible={replyModalVisible}
        onCancel={() => setReplyModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleReplySubmit} layout="vertical">
          <Form.Item name="reply" label="回复内容" rules={[{ required: true, message: '请输入回复内容' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              提交
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantReviews;
