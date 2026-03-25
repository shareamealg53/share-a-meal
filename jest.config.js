module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  verbose: true,
};