const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('./auth-middleware');

// Mock user database (in a real application, this would be a real database)
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'StrongPassword123',
    roles: ['admin', 'user']
  },
  {
    id: 2,
    username: 'user',
    password: 'Password123',
    roles: ['user']
  }
];

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Find user
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({
      code: 401,
      status: 'Error',
      message: 'Invalid credentials',
      data: null
    });
  }

  try {
    // Compare passwords
    const isMatch = await password.localeCompare(user.password);

    if (!isMatch) {
      return res.status(401).json({
        code: 401,
        status: 'Error',
        message: 'Invalid credentials!',
        data: null
      });
    }

    // Generate JWT token with user roles
    const token = generateToken({ 
      id: user.id, 
      username: user.username,
      roles: user.roles  // Include roles in the token
    });

    res.json({
      code: 200,
      status: 'Success',
      message: 'Login successful',
      data: { token }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      code: 500,
      status: 'Error',
      message: 'Internal server error',
      data: null
    });
  }
});

module.exports = router;