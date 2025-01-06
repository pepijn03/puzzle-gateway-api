const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({
      code: 401,
      status: 'Error',
      message: 'No authentication token provided',
      data: null
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: 'Invalid or expired token',
        data: null
      });
    }

    req.user = user;
    next();
  });
};

// Fixed role authorization with strict checking
const authorizeRoles = (methodRoles) => {
  return (req, res, next) => {
    const method = req.method.toLowerCase();
    
    // Debug logging
    console.log('Request method:', method);
    console.log('User roles:', req.user?.roles);
    console.log('Required roles for method:', methodRoles[method]);

    // Check if user exists and has roles
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: 'User has no roles assigned',
        data: null
      });
    }

    // Get required roles for the current HTTP method
    const requiredRoles = methodRoles[method] || [];
    
    // If no roles specified for this method, deny access by default
    if (!requiredRoles || requiredRoles.length === 0) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: `No role configuration for ${method} requests`,
        data: null
      });
    }

    // Check if user has ALL required roles for this method
    const hasAllRequiredRoles = requiredRoles.every(role => 
      req.user.roles.includes(role)
    );

    if (!hasAllRequiredRoles) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: `Insufficient permissions for ${method} request. Required roles: ${requiredRoles.join(', ')}`,
        data: null
      });
    }

    next();
  };
};

const generateToken = (userPayload) => {
  return jwt.sign(userPayload, JWT_SECRET, { 
    expiresIn: '1h'
  });
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  generateToken
};