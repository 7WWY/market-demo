import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from '../components/Login_wwy'
import Register from '../components/Register_wwy'
import MerchantDashboard from '../components/MerchantDashboard_wwy'
import AddProductForm from '../components/AddProductForm_wwy'
import RemoveProductForm from '../components/RemoveProductForm_wwy'
import CustomerDashbord from '../components/CustomerDashbord_wwy'
import ProductList from '../components/ProductList_wwy'
import FavoritesList from '../components/FavoritesList_wwy'
import ProductDetail from '../components/ProductDetails_wwy'
import MyOrders from '../components/MyOrders_wwy';
import MyReviews from '../components/MyReviews_wwy';
import MerchantReviews from '../components/MerchantReviews_wwy';


export default function MyRoute() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/api" element={<MerchantDashboard />}>
                <Route path="addGoods" element={<AddProductForm />} />
                <Route path="removeGoods" element={<RemoveProductForm />} />
                <Route path="replies" element={<MerchantReviews />} />
            </Route>

            <Route path="/customer" element={<CustomerDashbord />}>
                <Route path="goodsList" element={<ProductList />} />
                <Route path="favorites" element={<FavoritesList />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="reviews" element={<MyReviews />} />
            </Route>
            <Route path="product/:id" element={<ProductDetail />} />  {/* 添加商品详情页面路由 */}
      
        </Routes>
    )
}  