import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { storage } from '../storage'; // Adjust path as needed
import * as schema from '../../shared/schema'; // Adjust path as needed
import { ZodError } from 'zod';
import { Strategy as LocalStrategy } from 'passport-local'; // For LocalStrategy
import passport from 'passport'; // For mocking passport.use

// Import the specific route handlers or the app instance to test them
// For simplicity, let's assume we can get a reference to the specific route handler functions
// or we will test the LocalStrategy callback directly.
// This example will focus on testing the LocalStrategy callback directly for login
// and simulate a call to the registration handler.

// Mock server/routes.ts or the relevant parts for registerUserHandler
// This is a simplified approach. In a real scenario, you might use supertest or a similar library.
let registerUserHandler;
let localStrategyVerify;


// Mock dependencies
vi.mock('bcrypt');
vi.mock('../storage'); // Assuming storage is in the parent directory
vi.mock('passport', async (importOriginal) => {
  const actualPassport = await importOriginal();
  return {
    ...actualPassport,
    default: { // Assuming passport is default exported
        ...actualPassport.default,
        use: vi.fn((strategy) => {
            // Capture the strategy's verify function if it's LocalStrategy
            if (strategy instanceof LocalStrategy) {
                localStrategyVerify = strategy._verify;
            }
        }),
        authenticate: vi.fn(() => (req, res, next) => next()), // Simplified mock
        serializeUser: vi.fn(),
        deserializeUser: vi.fn(),
        initialize: vi.fn(() => (req, res, next) => next()),
        session: vi.fn(() => (req, res, next) => next()),
    }
  };
});


// Mock Express request and response objects
const mockRequest = (body: any = {}, user: any = null) => ({
  body,
  login: vi.fn((usr, cb) => { 
    (mockRequest as any).user = usr; // Simulate user being attached to req
    cb(null);
  }),
  user, // For login handler to simulate req.user
  logout: vi.fn(cb => {
    (mockRequest as any).user = null;
    cb(null);
  }),
  isAuthenticated: vi.fn(() => !!(mockRequest as any).user),
});

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(async () => {
  vi.clearAllMocks();

  // Dynamically import routes to ensure mocks are applied
  // And to re-capture the localStrategyVerify if passport.use is called upon import
  const { registerRoutes } = await import('../routes');
  const express = await import('express');
  const app = express.default();
  app.use(express.json());
  
  // We need to re-trigger passport.use, which happens in registerRoutes
  // The mock for passport.use will capture the localStrategyVerify
  await registerRoutes(app);


  // Simulate how the register route handler might be obtained or called
  // For this example, we'll assume 'registerUserHandler' is the actual function
  // from your routes file. You'd need to export it or use a test runner like supertest.
  // This is a simplified direct assignment for the purpose of this example.
  const foundRoute = app._router.stack.find(
    (s) => s.route && s.route.path === '/api/auth/register' && s.route.methods.post
  );
  if (foundRoute && foundRoute.route && foundRoute.route.stack && foundRoute.route.stack[0]) {
    registerUserHandler = foundRoute.route.stack[0].handle;
  } else {
    // Fallback or throw error if not found, to avoid test failures later
    // console.warn("Register route handler not found directly, ensure it's exposed or use supertest");
    // For now, create a dummy handler if not found to let tests run, but they might not be meaningful
    registerUserHandler = async (req, res) => res.status(500).json({ message: "Handler not found" });
  }
   // Ensure localStrategyVerify is captured
  if (!localStrategyVerify && passport.use.mock.calls.length > 0) {
    const strategyArg = passport.use.mock.calls.find(call => call[0] instanceof LocalStrategy);
    if (strategyArg) {
        localStrategyVerify = strategyArg[0]._verify;
    }
  }
  if (!localStrategyVerify) {
    // If still not found, create a dummy to avoid crashes, though login tests might not be meaningful
    // console.warn("LocalStrategy verify function not captured.");
    localStrategyVerify = async (username, password, done) => done(new Error("Strategy not captured"));
  }

});

describe('Auth Logic', () => {
  describe('Registration (/api/auth/register)', () => {
    it('should hash the password and create a user on successful registration', async () => {
      const req = mockRequest({ username: 'newUser', password: 'password123' });
      const res = mockResponse();

      vi.spyOn(schema, 'insertUserSchema', 'get').mockReturnValue({
        parse: vi.fn().mockReturnValue({ username: 'newUser', password: 'password123' })
      });
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(null); // User does not exist
      (bcrypt.hash as vi.Mock).mockResolvedValue('hashedPassword123');
      (storage.createUser as vi.Mock).mockResolvedValue({ id: '1', username: 'newUser', password: 'hashedPassword123' });

      await registerUserHandler(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(storage.createUser).toHaveBeenCalledWith('newUser', 'hashedPassword123');
      expect(req.login).toHaveBeenCalled(); // Check if req.login was called
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Registration successful' });
    });

    it('should return 400 if username is already taken', async () => {
      const req = mockRequest({ username: 'existingUser', password: 'password123' });
      const res = mockResponse();
      
      vi.spyOn(schema, 'insertUserSchema', 'get').mockReturnValue({
        parse: vi.fn().mockReturnValue({ username: 'existingUser', password: 'password123' })
      });
      (storage.getUserByUsername as vi.Mock).mockResolvedValue({ id: '1', username: 'existingUser' }); // User exists

      await registerUserHandler(req, res);

      expect(storage.createUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Username already taken' });
    });

    it('should return 400 for invalid registration input (ZodError)', async () => {
      const req = mockRequest({ username: 'u', password: 'p' }); // Invalid input
      const res = mockResponse();
      const zodError = new ZodError([{ code: 'too_small', minimum: 3, type: 'string', inclusive: true, exact: false, message: 'Too short', path: ['username'] }]);
      
      vi.spyOn(schema, 'insertUserSchema', 'get').mockReturnValue({
        parse: vi.fn().mockImplementation(() => { throw zodError; })
      });

      await registerUserHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid input' }));
    });
  });

  describe('Login (LocalStrategy)', () => {
    it('should call bcrypt.compare and login successfully with correct credentials', async () => {
      const done = vi.fn();
      const mockUser = { id: '1', username: 'testuser', password: 'hashedPassword123' };
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as vi.Mock).mockResolvedValue(true); // Passwords match

      await localStrategyVerify('testuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should call bcrypt.compare and fail login with incorrect password', async () => {
      const done = vi.fn();
      const mockUser = { id: '1', username: 'testuser', password: 'hashedPassword123' };
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as vi.Mock).mockResolvedValue(false); // Passwords do not match

      await localStrategyVerify('testuser', 'wrongpassword', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Incorrect password' });
    });

    it('should fail login if user not found', async () => {
      const done = vi.fn();
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(null); // User not found

      await localStrategyVerify('unknownuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('unknownuser');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Incorrect username' });
    });

    it('should handle errors during login (e.g., database error)', async () => {
      const done = vi.fn();
      const dbError = new Error('Database connection failed');
      (storage.getUserByUsername as vi.Mock).mockRejectedValue(dbError);

      await localStrategyVerify('testuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(dbError);
    });
  });
});
