const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Mock http-proxy-middleware
jest.mock('http-proxy-middleware', () => {
  return {
    createProxyMiddleware: jest.fn((options) => {
      return (req, res, next) => {
        // Simply respond with 200 OK for successful proxy
        res.status(200).json({ 
          message: 'Proxy successful',
          method: req.method,
          path: req.path
        });
      };
    })
  };
});

const app = require('../../index'); // Your Express app
const { generateToken } = require('../../auth-middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('API Gateway RBAC Tests', () => {
  // Test tokens
  const adminToken = generateToken({ 
    id: 1, 
    username: 'admin',
    roles: ['admin', 'user']
  });
  
  const userToken = generateToken({ 
    id: 2, 
    username: 'user',
    roles: ['user']
  });

  describe('Users Endpoint RBAC Tests', () => {
    test('admin should have full access to /users endpoints', async () => {
      // Test all HTTP methods
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      
      for (const method of methods) {
        const response = await request(app)
          [method]('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(method === 'delete' ? 200 : 200); // All should succeed for admin

        expect(response.body).toEqual({
          message: 'Proxy successful',
          method: method.toUpperCase(),
          path: '/'
        });
      }
    });

    test('regular user should have limited access to /users endpoints', async () => {
      // Should succeed: GET, POST, PUT, PATCH
      const allowedMethods = ['get', 'post', 'put', 'patch'];
      for (const method of allowedMethods) {
        await request(app)
          [method]('/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      }

      // Should fail: DELETE
      const response = await request(app)
        .delete('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toEqual({
        code: 403,
        status: 'Error',
        message: expect.stringContaining('Required roles for delete: admin'),
        data: null
      });
    });
  });

  describe('Puzzle Endpoint RBAC Tests', () => {
    test('admin should have full access to /puzzle endpoints', async () => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      
      for (const method of methods) {
        await request(app)
          [method]('/puzzle')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    test('regular user should have read-only access to /puzzle endpoints', async () => {
      // Should succeed: GET
      await request(app)
        .get('/puzzle')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should fail: POST, PUT, DELETE, PATCH
      const restrictedMethods = ['post', 'put', 'delete', 'patch'];
      for (const method of restrictedMethods) {
        const response = await request(app)
          [method]('/puzzle')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toEqual({
          code: 403,
          status: 'Error',
          message: expect.stringContaining(`Required roles for ${method}`),
          data: null
        });
      }
    });
  });

  describe('Results Endpoint RBAC Tests', () => {
    test('admin should have full access to /results endpoints', async () => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      
      for (const method of methods) {
        await request(app)
          [method]('/results')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    test('regular user should have partial access to /results endpoints', async () => {
      // Should succeed: GET, POST, DELETE
      const allowedMethods = ['get', 'post', 'delete'];
      for (const method of allowedMethods) {
        await request(app)
          [method]('/results')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      }

      // Should fail: PUT, PATCH
      const restrictedMethods = ['put', 'patch'];
      for (const method of restrictedMethods) {
        const response = await request(app)
          [method]('/results')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body).toEqual({
          code: 403,
          status: 'Error',
          message: expect.stringContaining(`Required roles for ${method}`),
          data: null
        });
      }
    });
  });

  describe('Public Endpoint Tests', () => {
    test('should allow access to /leaderboard without authentication', async () => {
      await request(app)
        .get('/leaderboard')
        .expect(200);
    });

    test('should allow access to /leaderboard with any token', async () => {
      await request(app)
        .get('/leaderboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Authentication Error Tests', () => {
    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(403);

      expect(response.body).toEqual({
        code: 403,
        status: 'Error',
        message: 'Invalid or expired token',
        data: null
      });
    });

    test('should reject requests without token for protected routes', async () => {
      const response = await request(app)
        .get('/users')
        .expect(401);

      expect(response.body).toEqual({
        code: 401,
        status: 'Error',
        message: 'No authentication token provided',
        data: null
      });
    });
  });
});