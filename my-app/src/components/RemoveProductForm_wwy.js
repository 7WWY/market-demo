import React, { useState, useEffect } from "react";
import { Form, Button, Select, Typography, message } from "antd";
import { web3, MarketplaceContract } from '../contract/contractUtils'; // 更新后的导入路径

const { Option } = Select;

const RemoveProductForm = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [account, setAccount] = useState('');

  useEffect(() => {
    const fetchAccountAndProducts = async () => {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);

        // Fetch products from the server
        const response = await fetch(`http://localhost:5000/products?owner=${accounts[0]}`);
        const data = await response.json();
        setProducts(data);
      } else {
        message.error('请安装 MetaMask');
      }
    };

    fetchAccountAndProducts();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Fetch products for the new account
        fetch(`http://localhost:5000/products?owner=${accounts[0]}`)
          .then(response => response.json())
          .then(data => setProducts(data))
          .catch(error => console.error('获取商品失败:', error));
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const onFinish = async (values) => {
    try {
      // 调用智能合约下架商品
      await MarketplaceContract.methods.removeProduct(values.productId).send({ from: account, gas: '5000000' });

      message.success('商品下架成功');

      // 更新数据库中的商品状态
      const response = await fetch('http://localhost:5000/product/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: values.productId
        })
      });

      if (response.ok) {
        message.success('商品信息更新到数据库成功');
        setProducts(products.filter(product => product.id !== values.productId));
      } else {
        message.error('商品信息更新到数据库失败');
      }
    } catch (error) {
      console.error('下架商品错误:', error);
      message.error('下架商品失败，请重试');
    }
  };

  return (
    <Form
      form={form}
      name="remove_product"
      onFinish={onFinish}
      layout="vertical"
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <Typography.Title level={2} style={{ textAlign: 'center' }}>下架商品</Typography.Title>

      <Form.Item
        name="productId"
        label="选择商品"
        rules={[{ required: true, message: '请选择要下架的商品!' }]}
      >
        <Select placeholder="请选择要下架的商品">
          {products.map(product => (
            <Option key={product.id} value={product.id}>{product.name}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
          下架
        </Button>
      </Form.Item>
    </Form>
  );
};

export default RemoveProductForm;
