import { Link, Outlet, useNavigate } from "react-router-dom";
import React, { useState } from 'react';
import { MailOutlined, SettingOutlined, WalletOutlined } from '@ant-design/icons';
import { Layout, Menu, Button, theme } from 'antd';
import WalletModal from './WalletModal_wwy'; // 导入 WalletModal 组件
import './CustomerDashboard_wwy.css'; // 导入自定义 CSS

const { Header, Content, Footer, Sider } = Layout;

const items1 = [
    { key: '/', label: '首页' },
    { key: '/login', label: '登出' }
];

function getItem(label, key, icon, children, type) {
    return {
        key,
        icon,
        children,
        label,
        type,
    };
}

const items2 = [
    getItem('商家后台', 'sub1', <MailOutlined />, [
        getItem('商品管理', 'g1', null, [getItem('添加商品', '/api/addGoods'), getItem('商品下架', '/api/removeGoods')], 'group'),

    ]),
    {
        type: 'divider',
    },
    getItem('更多', 'sub4', <SettingOutlined />, [
        getItem('回复管理', 'g1', null, [getItem('回复评论', '/api/replies')], 'group'),
    ]),
];

const CustomerDashboard = () => {
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    const navigate = useNavigate();
    const [walletVisible, setWalletVisible] = useState(false);

    const showWallet = () => {
        setWalletVisible(true);
    };

    const hideWallet = () => {
        setWalletVisible(false);
    };

    return (
        <Layout className="dashboard-layout">
            <Header className="dashboard-header">
                <div className="logo">二手交易市场商家后台</div>
                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={['/']}
                    items={items1}
                    onClick={(e) => {
                        navigate(e.key, { replace: true })
                    }}
                />
                <Button
                    type="primary"
                    icon={<WalletOutlined />}
                    onClick={showWallet}
                    className="wallet-button"
                >
                    打开钱包
                </Button>
            </Header>
            <Content className="dashboard-content">
                <Layout className="inner-layout">
                    <Sider
                        className="dashboard-sider"
                        width={200}
                    >
                        <Menu
                            mode="inline"
                            items={items2}
                            onClick={(e) => {
                                navigate(e.key, { replace: true })
                            }}
                        />
                    </Sider>
                    <Content className="inner-content">
                        <Outlet />
                    </Content>
                </Layout>
            </Content>
            <WalletModal visible={walletVisible} onClose={hideWallet} />
        </Layout>
    );
};

export default CustomerDashboard;
