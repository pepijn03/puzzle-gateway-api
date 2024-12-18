const jwt = require('jsonwebtoken');

// Secret key for JWT - in production, this should be a secure, environment-specific secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  // Get the authorization header
  const authHeader = req.headers['authorization'];
  
  // Token is in the format 'Bearer TOKEN'
  const token = authHeader && authHeader.split(' ')[1];

  // If no token is present
  if (token == null) {
    return res.status(401).json({
      code: 401,
      status: 'Error',
      message: 'No authentication token provided',
      data: null
    });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    // If token is invalid
    if (err) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: 'Invalid or expired token',
        data: null
      });
    }

    // Attach user information to the request
    req.user = user;
    next();
  });
};

// Function to generate JWT token
const generateToken = (userPayload) => {
  return jwt.sign(userPayload, JWT_SECRET, { 
    expiresIn: '1h' // Token expires in 1 hour
  });
};

module.exports = {
  authenticateToken,
  generateToken
};