var express = require('express');
var router = express();
const {setupLogging} = require("./logging.js");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { authenticateToken } = require('./auth-middleware'); // Import JWT middleware

// Load the dotenv dependency and call the config method on the imported object
require('dotenv').config();

router.use(cors()); // Enable CORS
router.use(helmet()); // Add security headers
router.disable("x-powered-by"); // Hide Express server information
setupLogging(router);

// Define routes and corresponding microservices
const services = [
  {
    route: "/users",
    target: process.env.USER_BASEURL +  "/users/",
    requireAuth: true, // Indicates if route requires authentication
    roles: {
      get: ['admin', 'user'],   
      post: ['admin', 'user'],           
      put: ['admin', 'user'],           
      delete: ['admin'],        
      patch: ['admin', 'user']          
    }
  },
  {
    route: "/progress",
    target: process.env.PROGRESS_BASEURL +  "/progess/",
    requireAuth: true, // Indicates if route requires authentication
    roles: ['admin', 'user']
  },
  {
    route: "/puzzle",
    target: process.env.PUZZLE_BASEURL +  "/puzzle",
    requireAuth: true, // Indicates if route requires authentication
    roles: {
      get: ['admin', 'user'],   
      post: ['admin'],           
      put: ['admin'],           
      delete: ['admin'],        
      patch: ['admin']          
    }
  },
  {
    route: "/leaderboard",
    target: process.env.LEADERBOARD_BASEURL,
    requireAuth: false // Indicates if route requires authentication
  },
  {
    route: "/results",
    target: process.env.RESULTS_BASEURL +  "/results/",
    requireAuth: true, // Indicates if route requires authentication
    roles: {
      get: ['admin', 'user'],   
      post:['admin', 'user'],           
      put: ['admin'],           
      delete: ['admin', 'user'],        
      patch: ['admin']          
    }
  },
  // Add more services as needed either deployed or locally.
 ];
 
// Define rate limit constants
const rateLimit = 20; // Max requests per minute
const interval = 60 * 1000; // Time window in milliseconds (1 minute)

// Object to store request counts for each IP address
const requestCounts = {};

// Reset request count for each IP address every 'interval' milliseconds
setInterval(() => {
  Object.keys(requestCounts).forEach((ip) => {
    requestCounts[ip] = 0; // Reset request count for each IP address
  });
}, interval);

// Rate limiting middleware (keeping your existing implementation)
function rateLimitAndTimeout(req, res, next) {
  const ip = req.ip; // Get client IP address

  // Update request count for the current IP
  requestCounts[ip] = (requestCounts[ip] || 0) + 1;

  // Check if request count exceeds the rate limit
  if (requestCounts[ip] > rateLimit) {
    // Respond with a 429 Too Many Requests status code
    return res.status(429).json({
      code: 429,
      status: "Error",
      message: "Rate limit exceeded.",
      data: null,
    });
  }

  // Set timeout for each request (example: 10 seconds)
  req.setTimeout(15000, () => {
    // Handle timeout error
    res.status(504).json({
      code: 504,
      status: "Error",
      message: "Gateway timeout.",
      data: null,
    });
    req.abort(); // Abort the request
  });
  next();
}

// Method-specific role checking middleware
function checkMethodRoles(configuredRoles) {
  return (req, res, next) => {
    const method = req.method.toLowerCase();
    console.log(`Checking roles for ${method} request`);
    
    // If no roles configured at all, deny access
    if (!configuredRoles) {
      return res.status(403).json({
        code: 403,
        status: 'Error',
        message: 'No role configuration found',
        data: null
      });
    }

    // Handle both object-style and array-style role configurations
    if (Array.isArray(configuredRoles)) {
      // If roles is an array, apply it to all methods
      const hasRequiredRole = configuredRoles.some(role => 
        req.user.roles.includes(role)
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          code: 403,
          status: 'Error',
          message: `Access denied. Required roles: ${configuredRoles.join(', ')}`,
          data: null
        });
      }
    } else {
      // Check for method-specific roles
      const requiredRoles = configuredRoles[method];
      
      // If no roles specified for this method, deny access
      if (!requiredRoles || !Array.isArray(requiredRoles)) {
        return res.status(403).json({
          code: 403,
          status: 'Error',
          message: `No role configuration for ${method} requests`,
          data: null
        });
      }

      // Check if user has any of the required roles for this method
      const hasRequiredRole = requiredRoles.some(role => 
        req.user.roles.includes(role)
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          code: 403,
          status: 'Error',
          message: `Access denied. Required roles for ${method}: ${requiredRoles.join(', ')}`,
          data: null
        });
      }
    }

    next();
  };
}

// Set up proxy middleware for each microservice
services.forEach(({ route, target, requireAuth = false, roles = null }) => {
  const proxyOptions = {
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: "",
    },
  };

  // Create middleware stack for this route
  const middlewareStack = [rateLimitAndTimeout];

  if (requireAuth) {
    // Add authentication middleware
    middlewareStack.push(authenticateToken);
    
    // Add role authorization middleware if roles are specified
    if (roles) {
      middlewareStack.push(checkMethodRoles(roles));
    }
  }

  // Add the proxy middleware last
  middlewareStack.push(createProxyMiddleware(proxyOptions));

  // Apply all middleware to the route
  router.use(route, ...middlewareStack);
});

// Basic health check route
router.get('/', function(req, res) {
  res.send('Gateway API running!');
});

module.exports = router;