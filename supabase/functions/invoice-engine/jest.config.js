export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          target: 'ES2022',
          strict: true,
          esModuleInterop: true,
          lib: ['ES2022'],
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  verbose: true,
};