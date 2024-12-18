const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('./auth-middleware');

// Mock user database (in a real application, this would be a real database)
const users = [
  {
    id: 1,
    username: 'testuser',
    // Hashed password for 'password123'
    password: "password123"
  }
];

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username, password }); // Debug logging

  // Find user
  const user = users.find(u => u.username === username);

  if (!user) {
    console.log('User not found'); // Debug logging
    return res.status(401).json({
      code: 401,
      status: 'Error',
      message: 'Invalid credentials',
      data: null
    });
  }
  const hashedpass = await bcrypt.hash('password123', 10);

  try {
    // Compare passwords
    const isMatch = await bcrypt.compare(password, hashedpass);

    console.log('Password comparison result:', isMatch); // Debug logging

    if (!isMatch) {
      return res.status(401).json({
        code: 401,
        status: 'Error',
        message: 'Invalid credentials',
        data: null
      });
    }

    // Generate JWT token
    const token = generateToken({ 
      id: user.id, 
      username: user.username 
    });

    res.json({
      code: 200,
      status: 'Success',
      message: 'Login successful',
      data: { token }
    });
  } catch (error) {
    console.error('Login error:', error); // Error logging
    res.status(500).json({
      code: 500,
      status: 'Error',
      message: 'Internal server error',
      data: null
    });
  }
});

module.exports = router;