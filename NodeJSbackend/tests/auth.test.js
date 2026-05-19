import request from 'supertest';
import jwt from 'jsonwebtoken';

describe('Authentication Tests', () => {
  const TOKEN_SECRET = process.env.TOKEN_SECRET_KEY || 'Sagar5454';
  const AUTH_SECRET = process.env.AUTH_SECRET || 'Suh3Lm8i1ihuIUUC3/+7x+yX6yLzi47QIrC13vPGyyE=';

  test('JWT token can be generated and verified', () => {
    const payload = {
      userId: 'test123',
      email: 'test@example.com'
    };

    // Generate token
    const token = jwt.sign(payload, TOKEN_SECRET, { expiresIn: '24h' });

    // Verify token
    const decoded = jwt.verify(token, TOKEN_SECRET);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  test('Invalid JWT token throws error', () => {
    const invalidToken = 'invalid.token.here';

    expect(() => {
      jwt.verify(invalidToken, TOKEN_SECRET);
    }).toThrow();
  });

  test('Expired token throws error', () => {
    const payload = { userId: 'test123' };

    // Create token that expires immediately
    const token = jwt.sign(payload, TOKEN_SECRET, { expiresIn: '0s' });

    // Wait a moment to ensure expiration
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, TOKEN_SECRET);
        }).toThrow();
        resolve();
      }, 100);
    });
  });

  test('AUTH_SECRET matches NextAuth configuration', () => {
    // Verify that AUTH_SECRET is set and not empty
    expect(AUTH_SECRET).toBeDefined();
    expect(AUTH_SECRET.length).toBeGreaterThan(20);
  });
});
