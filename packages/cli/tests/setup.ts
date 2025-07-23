import { vol } from 'memfs';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock os.homedir to return consistent test path
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/Users/test'),
}));

// Mock fs completely
jest.mock('fs', () => {
  const memfs = require('memfs');
  return {
    ...memfs.fs,
    existsSync: jest.fn((path: string) => memfs.vol.existsSync(path)),
  };
});

// Mock fs-extra completely
jest.mock('fs-extra', () => {
  const memfs = require('memfs');
  return {
    ...memfs.fs,
    readFile: jest.fn((path: string, encoding?: string) => {
      return new Promise((resolve, reject) => {
        try {
          const content = memfs.vol.readFileSync(path, encoding || 'utf8');
          resolve(content);
        } catch (error) {
          reject(error);
        }
      });
    }),
    writeFile: jest.fn((path: string, data: string, encoding?: string) => {
      return new Promise((resolve, reject) => {
        try {
          memfs.vol.writeFileSync(path, data, encoding || 'utf8');
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    }),
    ensureDir: jest.fn((path: string) => {
      return new Promise((resolve, reject) => {
        try {
          memfs.vol.mkdirSync(path, { recursive: true });
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    }),
    copy: jest.fn((src: string, dest: string) => {
      return new Promise((resolve, reject) => {
        try {
          const content = memfs.vol.readFileSync(src);
          // Ensure destination directory exists
          const destDir = require('path').dirname(dest);
          memfs.vol.mkdirSync(destDir, { recursive: true });
          memfs.vol.writeFileSync(dest, content);
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    }),
    existsSync: jest.fn((path: string) => memfs.vol.existsSync(path)),
  };
});

// Mock child_process for ClientManager
jest.mock('child_process', () => ({
  execSync: jest.fn(() => {
    // Default behavior - throw to simulate command not found
    throw new Error('Command not found');
  }),
}));

// Mock inquirer for ParameterHandler
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
  prompt: jest.fn(),
}));

// Mock chalk for ParameterHandler
jest.mock('chalk', () => ({
  default: {
    cyan: jest.fn((str) => str),
    yellow: jest.fn((str) => str),
    gray: jest.fn((str) => str),
    red: jest.fn((str) => str),
    green: jest.fn((str) => str),
  },
  cyan: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
}));

// Mock ora for install command
jest.mock('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn(() => ({
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    })),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  })),
}));

// Global test utilities
beforeEach(() => {
  vol.reset();
});

afterEach(() => {
  vol.reset();
});
