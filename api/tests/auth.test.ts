/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { storage } from '../storage'; // Removed .js
import * as schema from '../../shared/schema'; // Removed .js
import { ZodError } from 'zod';
import { Strategy as LocalStrategy, type VerifyFunction } from 'passport-local'; // Corrected import for IVerifyFunction
import type { Request, Response, NextFunction, Application, Express } from 'express';
import type { PassportStatic } from 'passport'; // For typing the mock

// Type for the user object, adjust as necessary
interface User {
  id: string;
  username: string;
  password?: string; // Password might not always be present
}

// Variables to hold route handlers and strategy verify function
let registerUserHandler: (req: Request, res: Response, next?: NextFunction) => Promise<void>;
let localStrategyVerifyCallback: VerifyFunction;

// Mock dependencies
vi.mock('bcryptjs');
vi.mock('../storage'); // Removed .js

// Properly mock passport module
vi.mock('passport', async (importOriginal) => {
  const actualPassport = await importOriginal<typeof import('passport')>(); // Ensure 'passport' type is used

  const MOCK_PASSPORT_INSTANCE: Partial<PassportStatic> = { // Use Partial for easier mocking
    use: vi.fn().mockReturnThis() as any, // Changed to mockReturnThis as per instructions
    authenticate: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    serializeUser: vi.fn((fn) => fn), // Pass through for type checking if needed
    deserializeUser: vi.fn((fn) => fn),
    initialize: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    session: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    // Add other static methods if used by your application
  };
  
  return {
    __esModule: true,
    default: MOCK_PASSPORT_INSTANCE, // This becomes 'passport' when imported
    ...(MOCK_PASSPORT_INSTANCE as PassportStatic) // Spread to allow named imports if any were defined
  };
});

// Mock Express request and response objects more robustly
interface MockRequest extends Request {
  login: vi.Mock<[User, (err?: Error | null) => void], void>;
  logout: vi.Mock<[(err?: Error | null) => void], void>;
  isAuthenticated: vi.Mock<[], boolean>;
  user?: User; // User property
}

interface MockResponse extends Response {
  status: vi.Mock<[number], MockResponse>;
  json: vi.Mock<[any], MockResponse>;
  setHeader: vi.Mock<[string, string | string[]], MockResponse>;
  end: vi.Mock<[], MockResponse>;
  locals: Record<string, any>; // Add locals for compatibility
}

const mockRequestFn = (body: any = {}, user: User | null = null): MockRequest => {
  let currentUser = user;
  const req = {
    body,
    user: currentUser,
    login: vi.fn((usr: User, cb: (err?: Error | null) => void) => { 
      req.user = usr; // Attach user to this specific req mock
      cb(null);
    }),
    logout: vi.fn((optionsOrCallback?: any, callback?: (err?: Error | null) => void) => {
      req.user = undefined;
      if (typeof optionsOrCallback === 'function') {
        optionsOrCallback(null);
      } else if (typeof callback === 'function') {
        callback(null);
      }
    }),
    isAuthenticated: vi.fn(() => !!req.user),
    // Add other properties/methods as needed by express or passport
    session: {} as any, 
    res: undefined, // Will be set by express if needed
  } as unknown as MockRequest;
  req.res = mockResponseFn(req); // Link response for cycle, if needed by some middleware
  return req;
};

const mockResponseFn = (req?: MockRequest): MockResponse => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    locals: {},
    req: req, // Link back to req if needed
  } as unknown as MockResponse;
  return res;
};


beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules(); // Important to re-evaluate modules with fresh mocks

  // Mock LocalStrategy to capture the verify callback
  // This mock must be before importing '../routes' or anything that calls `new LocalStrategy`
  vi.mock('passport-local', () => {
    return {
      Strategy: vi.fn().mockImplementation((optionsOrVerify: any, verify?: VerifyFunction) => {
        if (typeof optionsOrVerify === 'function') {
          localStrategyVerifyCallback = optionsOrVerify;
        } else if (typeof verify === 'function') {
          localStrategyVerifyCallback = verify;
        }
        return { name: 'local' }; // Return a basic strategy object
      })
    };
  });

  // Dynamically import routes to ensure mocks are applied
  const { registerRoutes } = await import('../routes'); // Removed .js
  const expressModule = await import('express');
  const app: Application = expressModule.default();
  app.use(expressModule.json());
  
  // Initialize passport (mocked)
  const passportMock = (await import('passport')).default as unknown as vi.Mocked<PassportStatic>;
  app.use(passportMock.initialize!()); // Use non-null assertion if sure it's mocked
  app.use(passportMock.session!());
  
  await registerRoutes(app as Express); // Cast app to Express

  // Find the registerUserHandler from the app stack
  const stack = app._router?.stack || [];
  const foundRoute = stack.find(
    (layer: any) => layer.route && layer.route.path === '/api/auth/register' && layer.route.methods.post
  );

  if (foundRoute?.route?.stack?.[0]?.handle) {
    registerUserHandler = foundRoute.route.stack[0].handle as (req: Request, res: Response, next?: NextFunction) => Promise<void>;
  } else {
    console.warn("Register route handler not found in test setup. Test might not be meaningful.");
    registerUserHandler = async (req: Request, res: Response) => { 
      res.status(500).json({ message: "Register handler not found in test setup" });
    };
  }

  if (!localStrategyVerifyCallback) {
    console.warn("LocalStrategy verify function not captured in test setup. Login tests might not be meaningful.");
    localStrategyVerifyCallback = async (username, password, done) => {
      done(new Error("LocalStrategy verify function not captured"));
    };
  }
});

describe('Auth Logic', () => {
  describe('Registration (/api/auth/register)', () => {
    it('should hash the password and create a user on successful registration', async () => {
      const req = mockRequestFn({ username: 'newUser', password: 'password123' });
      const res = mockResponseFn(req);
      req.res = res; // Link res back to req

      const mockParsedUser = { username: 'newUser', password: 'password123' };
      // Spy on the actual schema.insertUserSchema object's parse method
      vi.spyOn(schema.insertUserSchema, 'parse').mockReturnValue(mockParsedUser);
      
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(null);
      (bcrypt.hash as vi.Mock).mockResolvedValue('hashedPassword123');
      const createdUser = { id: '1', username: 'newUser', password: 'hashedPassword123' } as User;
      (storage.createUser as vi.Mock).mockResolvedValue(createdUser);

      await registerUserHandler(req, res, vi.fn() as NextFunction);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(storage.createUser).toHaveBeenCalledWith('newUser', 'hashedPassword123');
      expect(req.login).toHaveBeenCalledWith(createdUser, expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Registration successful' });
    });

    it('should return 400 if username is already taken', async () => {
      const req = mockRequestFn({ username: 'existingUser', password: 'password123' });
      const res = mockResponseFn(req);
      req.res = res;
      
      vi.spyOn(schema.insertUserSchema, 'parse').mockReturnValue({ username: 'existingUser', password: 'password123' });
      (storage.getUserByUsername as vi.Mock).mockResolvedValue({ id: '1', username: 'existingUser' });

      await registerUserHandler(req, res, vi.fn() as NextFunction);

      expect(storage.createUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Username already taken' });
    });

    it('should return 400 for invalid registration input (ZodError)', async () => {
      const req = mockRequestFn({ username: 'u', password: 'p' });
      const res = mockResponseFn(req);
      req.res = res;
      const zodError = new ZodError([{ code: 'too_small', minimum: 3, type: 'string', inclusive: true, exact: false, message: 'Too short', path: ['username'] }]);
      
      vi.spyOn(schema.insertUserSchema, 'parse').mockImplementation(() => { throw zodError; });

      await registerUserHandler(req, res, vi.fn() as NextFunction);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid input' }));
    });
  });

  describe('Login (LocalStrategy)', () => {
    it('should call bcrypt.compare and login successfully with correct credentials', async () => {
      const done = vi.fn();
      const mockUser = { id: '1', username: 'testuser', password: 'hashedPassword123' } as User;
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as vi.Mock).mockResolvedValue(true as never); // Cast to never for bool with mockResolvedValue

      await localStrategyVerifyCallback('testuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should call bcrypt.compare and fail login with incorrect password', async () => {
      const done = vi.fn();
      const mockUser = { id: '1', username: 'testuser', password: 'hashedPassword123' } as User;
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as vi.Mock).mockResolvedValue(false as never);

      await localStrategyVerifyCallback('testuser', 'wrongpassword', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Incorrect password' });
    });

    it('should fail login if user not found', async () => {
      const done = vi.fn();
      (storage.getUserByUsername as vi.Mock).mockResolvedValue(null);

      await localStrategyVerifyCallback('unknownuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('unknownuser');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Incorrect username' });
    });

    it('should handle errors during login (e.g., database error)', async () => {
      const done = vi.fn();
      const dbError = new Error('Database connection failed');
      (storage.getUserByUsername as vi.Mock).mockRejectedValue(dbError);

      await localStrategyVerifyCallback('testuser', 'password123', done);

      expect(storage.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(dbError);
    });
  });
});
