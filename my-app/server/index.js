const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// 创建MySQL连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'marketplace'
});

app.use(cors());
app.use(bodyParser.json());

// 用户注册接口
app.post('/register', async (req, res) => {
  const { address, username, password, phone, email, userType } = req.body;

  try {
    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (address, username, password, phone, email, userType) VALUES (?, ?, ?, ?, ?, ?)`;
    pool.query(query, [address, username, hashedPassword, phone, email, userType], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).send({ success: false, message: error.message });
      }
      res.send({ success: true });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Registration failed, please try again.' });
  }
});

// 用户登录接口
app.post('/login', (req, res) => {
  const { address, username, password } = req.body;
  console.log(`Received login request: address=${address}, username=${username}`); // 调试信息
  const query = `SELECT * FROM users WHERE address = ? AND username = ?`;
  
  pool.query(query, [address, username], async (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    if (results.length > 0) {
      const user = results[0];
      console.log(`User found: ${JSON.stringify(user)}`); // 调试信息
      const isMatch =  bcrypt.compare(password, user.password);
      if (isMatch) {
        res.send({ success: true, userType: user.userType });
      } else {
        console.log('Password does not match'); // 调试信息
        res.send({ success: false, message: 'Invalid address or password' });
      }
    } else {
      console.log('User not found'); // 调试信息
      res.send({ success: false, message: 'Invalid address or username' });
    }
  });
});

// 商品上架接口
app.post('/product/add', (req, res) => {
  const { name, description, price, type, quantity, imageHash, owner } = req.body;
  const query = `INSERT INTO products (name, description, price, type, quantity, imageHash, owner) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  pool.query(query, [name, description, price, type, quantity, imageHash, owner], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send({ success: true });
  });
});

// 获取商家的商品
app.get('/products', (req, res) => {
  const { search, minPrice, maxPrice } = req.query;
  let query = `SELECT * FROM products WHERE 1=1`;
  const queryParams = [];

  if (search) {
    query += ` AND (name LIKE ? OR description LIKE ?)`;
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (minPrice) {
    query += ` AND price >= ?`;
    queryParams.push(parseInt(minPrice, 10));
  }

  if (maxPrice) {
    query += ` AND price <= ?`;
    queryParams.push(parseInt(maxPrice, 10));
  }

  pool.query(query, queryParams, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send(results);
  });
});

// 商品下架接口
app.post('/product/remove', (req, res) => {
  const { productId } = req.body;
  const query = `DELETE FROM products WHERE id = ?`;
  pool.query(query, [productId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send({ success: true });
  });
});

// 更新商品数量接口
app.post('/updateProductQuantity', async (req, res) => {
  const { productId, purchaseQuantity, transactionHash, blockHash, blockNumber, buyer } = req.body;
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    // 更新商品数量
    const updateQuery = `UPDATE products SET quantity = quantity - ? WHERE id = ?`;
    await new Promise((resolve, reject) => {
      pool.query(updateQuery, [purchaseQuantity, productId], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });

    // 插入交易记录
    const insertQuery = `INSERT INTO transactions (txHash, buyer, productId, quantity, blockHash, blockNumber, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
      pool.query(insertQuery, [transactionHash, buyer, productId, purchaseQuantity, blockHash, blockNumber, timestamp], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });

    res.send({ success: true });
  } catch (error) {
    console.error('更新商品数量错误:', error);
    res.status(500).send({ success: false, message: 'Failed to update product quantity and store transaction record' });
  }
});

// 收藏商品接口
app.post('/favorites', (req, res) => {
  const { user, productId } = req.body;
  const query = `INSERT INTO favorites (user, productId) VALUES (?, ?)`;
  pool.query(query, [user, productId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send({ success: true });
  });
});

app.delete('/favorites', (req, res) => {
  const { user, productId } = req.body;
  const query = `DELETE FROM favorites WHERE user = ? AND productId = ?`;
  pool.query(query, [user, productId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send({ success: true });
  });
});

// 获取用户收藏的商品接口
app.get('/favorites', (req, res) => {
  const { user } = req.query;
  const query = `
    SELECT p.*
    FROM favorites f
    JOIN products p ON f.productId = p.id
    WHERE f.user = ?`;

  pool.query(query, [user], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send(results);
  });
});

// 获取商品详情和交易记录
// 获取商品详情和交易记录
app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const productQuery = `SELECT * FROM products WHERE id = ?`;
    const transactionQuery = `SELECT * FROM transactions WHERE productId = ?`;
    const reviewQuery = `
      SELECT r.*, rr.reply AS reply, rr.timestamp AS replyTimestamp
      FROM reviews r
      LEFT JOIN merchant_replies rr ON r.id = rr.reviewId
      WHERE r.productId = ?`;

    const productResults = await new Promise((resolve, reject) => {
      pool.query(productQuery, [productId], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });

    const transactionResults = await new Promise((resolve, reject) => {
      pool.query(transactionQuery, [productId], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });

    const reviewResults = await new Promise((resolve, reject) => {
      pool.query(reviewQuery, [productId], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });

    if (productResults.length === 0) {
      return res.status(404).send({ success: false, message: 'Product not found' });
    }

    const product = productResults[0];
    const transactions = transactionResults.map(tx => ({
      txHash: tx.txHash,
      buyer: tx.buyer,
      quantity: tx.quantity,
      blockHash: tx.blockHash,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp
    }));
    const reviews = reviewResults.map(review => ({
      id: review.id,
      productId: review.productId,
      name: review.name,
      reviewer: review.reviewer,
      content: review.content,
      image: review.image,
      timestamp: review.timestamp,
      reply: review.reply,
      replyTimestamp: review.replyTimestamp
    }));

    res.send({ success: true, product, transactions, reviews });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).send({ success: false, message: 'Failed to fetch product details' });
  }
});

// 添加订单的API
app.post('/orders/add', (req, res) => {
  const { productId, name, price, quantity, transactionHash, buyer, seller } = req.body;
  const query = 'INSERT INTO orders (productId, name, price, quantity, txHash, buyer, seller) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [productId, name, price, quantity, transactionHash, buyer, seller];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error('添加订单错误:', err);
      res.status(500).json({ success: false, message: '添加订单失败' });
      return;
    }
    res.json({ success: true });
  });
});

// 查询订单的API
app.get('/orders', (req, res) => {
  const { buyer } = req.query;
  const query = 'SELECT * FROM orders WHERE buyer = ?';

  pool.query(query, [buyer], (err, results) => {
    if (err) {
      console.error('查询订单错误:', err);
      res.status(500).json({ success: false, message: '查询订单失败' });
      return;
    }
    res.json(results);
  });
});

// 添加评论的API
app.post('/reviews/add', (req, res) => {
  const { productId,name, content, image, reviewer,txHash } = req.body;
  const query = 'INSERT INTO reviews (productId, name, content, image, reviewer,txHash) VALUES (?, ?, ?, ?,?,?)';
  const values = [productId,name, content, image, reviewer,txHash];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error('添加评论错误:', err);
      res.status(500).json({ success: false, message: '添加评论失败' });
      return;
    }
    res.json({ success: true });
  });
});

// 查询评论的API
app.get('/reviews', (req, res) => {
  const { reviewer } = req.query;
  const query = `
    SELECT r.*, rr.reply AS reply, rr.timestamp AS replyTimestamp
    FROM reviews r
    LEFT JOIN merchant_replies rr ON r.id = rr.reviewId
    WHERE r.reviewer = ?
  `;

  pool.query(query, [reviewer], (err, results) => {
    if (err) {
      console.error('查询评论错误:', err);
      res.status(500).json({ success: false, message: '查询评论失败' });
      return;
    }
    res.json(results);
  });
});


// 获取商家的订单和评论接口
app.get('/merchant/orders', async (req, res) => {
  const { merchant } = req.query;

  try {
    const ordersQuery = `
      SELECT o.*, p.name
      FROM orders o
      JOIN products p ON o.productId = p.id
      WHERE p.owner = ?`;
    
    const reviewsQuery = `
      SELECT r.*, mr.reply
      FROM reviews r
      LEFT JOIN merchant_replies mr ON r.id = mr.reviewId
      WHERE r.productId IN (SELECT id FROM products WHERE owner = ?)`;

    const orders = await new Promise((resolve, reject) => {
      pool.query(ordersQuery, [merchant], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    const reviews = await new Promise((resolve, reject) => {
      pool.query(reviewsQuery, [merchant], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    res.send({ orders, reviews });
  } catch (error) {
    console.error('获取订单和评论错误:', error);
    res.status(500).send({ success: false, message: 'Failed to fetch orders and reviews' });
  }
});

// 商家回复评论接口
app.post('/reviews/reply', (req, res) => {
  const { reviewId, reply } = req.body;
  const query = `INSERT INTO merchant_replies (reviewId, reply) VALUES (?, ?)`;

  pool.query(query, [reviewId, reply], (error, results) => {
    if (error) {
      console.error('回复评论错误:', error);
      return res.status(500).send({ success: false, message: error.message });
    }
    res.send({ success: true });
  });
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
