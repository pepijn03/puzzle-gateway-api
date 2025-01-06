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
    roles: ['admin']
  },
  // Add more services as needed either deployed or locally.
 ];

// Rate limiting middleware (keeping your existing implementation)
function rateLimitAndTimeout(req, res, next) {
  // ... your existing rate limit code
  next();
}

// Set up proxy middleware for each microservice
services.forEach(({ route, target, requireAuth = false, roles = [] }) => {
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
    if (roles && roles.length > 0) {
      // For simple role-based auth without HTTP method specificity
      middlewareStack.push((req, res, next) => {
        if (!req.user || !req.user.roles) {
          return res.status(403).json({
            code: 403,
            status: 'Error',
            message: 'User has no roles assigned',
            data: null
          });
        }

        const hasRequiredRole = roles.some(role => req.user.roles.includes(role));
        
        if (!hasRequiredRole) {
          return res.status(403).json({
            code: 403,
            status: 'Error',
            message: `Access denied. Required roles: ${roles.join(', ')}`,
            data: null
          });
        }

        next();
      });
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