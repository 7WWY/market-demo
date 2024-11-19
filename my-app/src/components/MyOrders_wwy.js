import React, { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Form, Input, message, Upload, Pagination } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { web3, MarketplaceContract } from '../contract/contractUtils';

const { TextArea } = Input;
const { Dragger } = Upload;

const MyOrders = () => {
    const [account, setAccount] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [imageHash, setImageHash] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

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

    const fetchOrders = async (account) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/orders?buyer=${account}`);
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            } else {
                message.error('无法获取订单列表');
            }
        } catch (error) {
            console.error('获取订单列表错误:', error);
            message.error('获取订单列表失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (order) => {
        setCurrentOrder(order);
        setReviewModalVisible(true);
    };

    const handleFileInputChange = (info) => {
        if (info.fileList.length > 1) {
            info.fileList.splice(0, 1);
        }
        setSelectedFile(info.file);
    };

    const handleUpload = async () => {
        try {
            if (!selectedFile) {
                console.error("No file selected");
                return;
            }

            setUploading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
                method: "POST",
                body: formData,
                headers: {
                    pinata_api_key: "6f248010bbe2ca54a01c",
                    pinata_secret_api_key: "22b69ba2fe543dbff64c8b1265c6ea4d1733289d5d6e8697ce283098ed56adac",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to upload file to Pinata");
            }

            const data = await response.json();
            setImageHash(data.IpfsHash);
            message.success("文件上传成功");
        } catch (error) {
            console.error("文件上传到Pinata出错:", error);
            message.error("文件上传失败");
        } finally {
            setUploading(false);
        }
    };

    const handleReviewSubmit = async (values) => {
        try {
            await MarketplaceContract.methods.addReview(currentOrder.productId, values.content, imageHash).send({ from: account });
            message.success('评论提交成功');

            await fetch('http://localhost:5000/reviews/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId: currentOrder.productId,
                    name: currentOrder.name,
                    reviewer: account,
                    content: values.content,
                    image: imageHash,
                    txHash:currentOrder.txHash,
                    timestamp: new Date().toISOString()
                })
            });

            setReviewModalVisible(false);
        } catch (error) {
            console.error('提交评论错误:', error);
            message.error('提交评论失败');
        }
    };

    const handlePageChange = (page, pageSize) => {
        setCurrentPage(page);
        setPageSize(pageSize);
    };

    const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div style={{ padding: '24px' }}>
            <List
                grid={{ gutter: 16, column: 1 }}
                dataSource={paginatedOrders}
                renderItem={item => (
                    <List.Item key={item.id}>
                        <Card title={`商品名称: ${item.name}`}>
                            <p>价格: {item.price} WWY</p>
                            <p>数量: {item.quantity}</p>
                            <p>交易哈希: {item.txHash}</p>
                            <p>时间: {new Date(item.timestamp).toLocaleString()}</p>
                            <Button type="primary" onClick={() => handleReview(item)}>评论</Button>                            
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
                title="添加评论"
                visible={reviewModalVisible}
                onCancel={() => setReviewModalVisible(false)}
                footer={null}
            >
                <Form onFinish={handleReviewSubmit} layout="vertical">
                    <Form.Item name="content" label="评论内容" rules={[{ required: true, message: '请输入评论内容' }]}>
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item label="评论图片">
                        <Dragger
                            name="file"
                            multiple={false}
                            onChange={handleFileInputChange}
                            beforeUpload={() => false}
                            style={{ marginBottom: "20px" }}
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined />
                            </p>
                            <p className="ant-upload-text">点击或拖动文件到此区域上传</p>
                        </Dragger>
                        <Button type="primary" onClick={handleUpload} disabled={uploading || !selectedFile} style={{ width: '100%' }}>
                            {uploading ? "上传中" : "上传"}
                        </Button>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: '100%' }} disabled={!imageHash}>
                            提交
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MyOrders;
