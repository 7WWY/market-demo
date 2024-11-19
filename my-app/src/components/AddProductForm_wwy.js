import React, { useState } from "react";
import { Form, Input, InputNumber, Button, Upload, Typography, message, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { web3, MarketplaceContract } from "../contract/contractUtils";

const { TextArea } = Input;
const { Dragger } = Upload;
const { Option } = Select;

const AddProductForm = () => {
  const [form] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageHash, setImageHash] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false); // 控制添加按钮状态

  const onFinish = async (values) => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    try {
      // 调用智能合约上架商品
      await MarketplaceContract.methods.addProduct(
        values.name,
        values.description,
        parseInt(values.price),
        values.quantity,
        imageHash
      ).send({ from: account, gas: '5000000' });

      message.success('商品上架成功');

      // 将商品信息保存到数据库
      const response = await fetch('http://localhost:5000/product/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          price: values.price,
          type: values.type,
          quantity: values.quantity,
          imageHash: imageHash,
          owner: account
        })
      });

      if (response.ok) {
        message.success('商品信息保存到数据库成功');
        window.location.href = "/api";
      } else {
        message.error('商品信息保存到数据库失败');
      }
    } catch (error) {
      console.error('上架商品错误:', error);
      message.error('上架商品失败，请重试');
    }
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
      setUploadSuccess(true); // 设置上传成功状态
    } catch (error) {
      console.error("文件上传到Pinata出错:", error);
      message.error("文件上传失败");
      setUploadSuccess(false); // 设置上传失败状态
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form
      form={form}
      name="add_product"
      onFinish={onFinish}
      layout="vertical"
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <Typography.Title type="warning" level={2} style={{ textAlign: 'center' }}>添加商品</Typography.Title>

      <Form.Item
        name="name"
        label="商品名称"
        rules={[{ required: true, message: '请输入商品名称!' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="description"
        label="商品描述"
        rules={[{ required: true, message: '请输入商品描述!' }]}
      >
        <TextArea rows={4} />
      </Form.Item>

      <Form.Item
        name="type"
        label="商品类型"
        rules={[{ required: true, message: '请选择商品类型!' }]}
      >
        <Select placeholder="请选择商品类型">
          <Option value="electronics">电子产品</Option>
          <Option value="clothing">服装</Option>
          <Option value="furniture">家具</Option>
          <Option value="books">书籍</Option>
          <Option value="other">其他</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="quantity"
        label="商品数量"
        rules={[{ required: true, message: '请输入商品数量!' }]}
      >
        <InputNumber min={1} max={10000} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="price"
        label="商品价格 (ETH)"
        rules={[{ required: true, message: '请输入商品价格!' }]}
      >
        <InputNumber min={0.01} max={10000} step={0.01} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="商品图片"
      >
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
        <Button type="primary" htmlType="submit" style={{ width: '100%' }} disabled={!uploadSuccess}>
          添加
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AddProductForm;
