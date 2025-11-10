
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/context/(.*)$': '<rootDir>/context/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/locales/(.*)$': '<rootDir>/locales/$1'
  },
};

module.exports = createJestConfig(customJestConfig);
