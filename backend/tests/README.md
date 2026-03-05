# ShareAMeal Test Suite

Comprehensive API endpoint testing using Jest and Supertest.

## Setup

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Create Test Databases

Create a separate test database to avoid affecting your development data:

```sql
CREATE DATABASE sharemeal_test;
USE sharemeal_test;

-- Run all CREATE TABLE statements from db/shareMeal.sql
```

### 3. Configure Environment

Test environment variables are set automatically in `jest.setup.js`. The test database name is `sharemeal_test`.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test auth
npm test meals
npm test claims
npm test claims

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Files

- **auth.test.js** - Authentication endpoints (register, login)
- **meals.test.js** - Meal CRUD operations and listing
- **claims.test.js** - Claim lifecycle (claim, pickup, complete, cancel)
- **admin.test.js** - Admin verification and user management

## Test Coverage

Each test file covers:
- ✅ Success cases
- ✅ Validation errors (missing fields, invalid data)
- ✅ Authentication/authorization failures
- ✅ Not found errors (invalid IDs)
- ✅ Forbidden actions (wrong role)
- ✅ Edge cases and state conflicts

## Test Structure

All tests follow this pattern:

```javascript
describe('Endpoint Group', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Create users, login, get tokens
  });

  describe('POST /endpoint', () => {
    test('Should succeed with valid data', async () => {
      const response = await request(app)
        .post('/endpoint')
        .set('Authorization', `Bearer ${token}`)
        .send({ data: 'value' });
      
      expect(response.status).toBe(200);
    });

    test('Should fail with invalid data', async () => {
      // Test error cases
    });
  });
});
```

## Error Code Verification

Tests verify your AppError codes:
- `VALIDATION_ERROR` - Missing/invalid fields
- `AUTH_FAILED` - Invalid credentials
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - State conflict (e.g., already claimed)
- `INVALID_PARAM` - Invalid parameter value
- `INVALID_STATE` - Invalid state transition
- `INVALID_FORMAT` - Invalid data format

## Notes

- Tests use unique timestamps in emails to avoid conflicts
- Test database is isolated from development data
- Each test file is independent and can run standalone
- Tests clean up after themselves where necessary
- Background guards are disabled during tests (5-second startup delay)

## Troubleshooting

**Database errors:**
- Make sure `sharemeal_test` database exists
- Ensure all tables are created from `db/shareMeal.sql`

**Timeout errors:**
- Tests have 10-second timeout (set in jest.setup.js)
- Check database connection in .env

**Token errors:**
- Verify JWT_SECRET is set (jest.setup.js overrides for tests)
- Check authentication middleware is working

## Next Steps

After tests pass:
1. Review coverage report: `npm run test:coverage`
2. Add tests for AI endpoints (optional)
3. Add tests for metrics endpoints (optional)
4. Set up CI/CD to run tests automatically
