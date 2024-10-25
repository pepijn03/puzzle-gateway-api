var express = require('express');
var router = express();
const {setupLogging} = require("./logging.js");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
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
    target: "http://localhost:3001/users/",
  },
  {
    route: "/progress",
    target: "http://localhost:3002/progess/",
  },
  {
    route: "/puzzle",
    target: "http://localhost:3003/puzzle",
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

// Middleware function for rate limiting and timeout handling
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

  next(); // Continue to the next middleware
}

// Apply the rate limit and timeout middleware to the proxy
router.use(rateLimitAndTimeout);

// Set up proxy middleware for each microservice
services.forEach(({ route, target }) => {
  // Proxy options
  const proxyOptions = {
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: "",
    },
  };

  // Apply rate limiting and timeout middleware before proxying
  router.use(route, rateLimitAndTimeout, createProxyMiddleware(proxyOptions));
});

/* GET home page. */
router.get('/', getStatus = function(req, res, next) {
  res.send('Gateway API running!');
});

module.exports = router;
