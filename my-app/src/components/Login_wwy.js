import React, { useEffect } from 'react';
import { Button, Form, Input, Typography, Row, Col, Card, message } from 'antd';
import axios from 'axios';
import './login_wwy.css';
import { web3 } from "../contract/contractUtils";

const { Title } = Typography;

const Login = () => {
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchAccount = async () => {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      form.setFieldsValue({ address: accounts[0] });
    };

    fetchAccount();

    // 监听账户变化
    window.ethereum.on('accountsChanged', (accounts) => {
      form.setFieldsValue({ address: accounts[0] });
    });

    return () => {
      // 移除事件监听器
      window.ethereum.removeListener('accountsChanged', (accounts) => {
        form.setFieldsValue({ address: accounts[0] });
      });
    };
  }, [form]);

  const onFinish = async (values) => {
    console.log('Received values of form: ', values);

    try {
      // 发送登录请求到服务器进行验证
      const response = await axios.post('http://localhost:5000/login', {
        address: values.address,
        username: values.username,
        password: values.password,
      });

      if (response.data.success) {
        message.success('Login successful!');
        const userType = response.data.userType;
        if (userType === 'merchant') {
          window.location.href = "/api";//更换商家dashboard
        } else if (userType === 'customer') {
          window.location.href = "/customer";//更换用户dashboard
        } else {
          message.error('Unknown user type');
        }
      } else {
        console.error(response.data.message);
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('Login failed, please try again.');
    }
  };

  return (
    <Row justify="center" align="middle" style={{ height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Col>
        <Card className="login-card" bordered={false}>
          <Title level={2} className="login-form-title">Login</Title>
          <Form
            {...{
              labelCol: { span: 8 },
              wrapperCol: { span: 16 },
            }}
            form={form}
            name="login"
            onFinish={onFinish}
            scrollToFirstError
          >
            <Form.Item
              name="address"
              label="Wallet Address"
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please input your username!' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please input your password!' }]}
              hasFeedback
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              wrapperCol={{ span: 16, offset: 8 }}
            >
              <Button type="primary" htmlType="submit" className="login-form-button">
                Login
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center' }}>
            <span>没有账号？</span>
            <Button type="link" onClick={() => window.location.href = '/register'}>
              注册
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;
