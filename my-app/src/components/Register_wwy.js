import React from 'react';
import { Button, Form, Input, Typography, Row, Col, Card, Checkbox, Select, message } from 'antd';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import './register_wwy.css';
import { web3, MarketplaceContract } from "../contract/contractUtils";

const { Title } = Typography;
const { Option } = Select;

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const tailFormItemLayout = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 16, offset: 8 },
  },
};

const Register = () => {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    console.log('Received values of form: ', values);
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    try {
      // 哈希密码
      const hashedPassword = await bcrypt.hash(values.password, 10);

      // 调用智能合约进行注册
      const isRegister = await MarketplaceContract.methods.register(
        values.username,
        hashedPassword,
        values.userType,
      ).send({ from: account, gas: "3000000" });

      if (isRegister) {
        // 发送用户信息到服务器以保存到数据库
        const response = await axios.post('http://localhost:5000/register', {
          address: account,
          username: values.username,
          password: hashedPassword,
          phone: values.phone,
          email: values.email,
          userType: values.userType,
        });

        if (response.data.success) {
          message.success('Registration successful!');
          window.location.href = "/";
        } else {
          console.error(response.data.message);
          message.error(response.data.message);
        }
      } else {
        console.log("注册失败");
        message.error("Registration failed, please try again.");
      }
    } catch (error) {
      console.error('Registration error:', error);
      message.error('Registration failed, please try again.');
    }
  };

  return (
    <Row justify="center" align="middle" style={{ height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Col>
        <Card className="register-card" bordered={false}>
          <Title level={2} className="register-form-title">Register</Title>
          <Form
            {...formItemLayout}
            form={form}
            name="register"
            onFinish={onFinish}
            scrollToFirstError
          >
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
              name="confirm"
              label="Confirm Password"
              dependencies={['password']}
              hasFeedback
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[{ required: true, message: 'Please input your phone number!' }]}
            >
              <Input style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="email"
              label="E-mail"
              rules={[
                {
                  type: 'email',
                  message: 'The input is not valid E-mail!',
                },
                {
                  required: true,
                  message: 'Please input your E-mail!',
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="userType"
              label="User Type"
              rules={[{ required: true, message: 'Please select user type!' }]}
            >
              <Select placeholder="Select your user type">
                <Option value="merchant">商家</Option>
                <Option value="customer">用户</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('Should accept agreement')) }]}
              {...tailFormItemLayout}
            >
              <Checkbox>
                I have read the <a href="">agreement</a>
              </Checkbox>
            </Form.Item>
            <Form.Item {...tailFormItemLayout}>
              <Button type="primary" htmlType="submit" className="register-form-button">
                Register
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Register;
