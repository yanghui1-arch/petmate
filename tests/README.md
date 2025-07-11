# Unit Testing Guide

This project uses a focused unit testing setup for fast development feedback:

## 🧪 Testing Stack

- **Vitest**: Fast unit and integration testing
- **Vue Test Utils**: Vue component testing
- **jsdom**: Browser environment simulation

## 📁 Test Structure

```
tests/
├── setup.ts                 # Global test setup and mocks
├── unit/                    # Unit tests for utilities and logic
│   └── utils/
│       └── calc.test.ts
└── components/              # Vue component tests
    └── AttributeBar.test.ts
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests

```bash
# Run tests in watch mode (recommended for development)
npm run test

# Run tests once
npm run test:run

# Run with coverage report
npm run test:coverage

# Run with interactive UI
npm run test:ui
```

## 📝 Writing Tests

### Unit Tests
Create tests in `tests/unit/` or alongside your source files:

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should work correctly', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })
})
```

### Component Tests
Create tests in `tests/components/`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { message: 'Hello' }
    })
    expect(wrapper.text()).toContain('Hello')
  })
})
```

## 🔧 Configuration

- `vitest.config.ts`: Test configuration
- `tests/setup.ts`: Global test setup and mocks

## 📊 Coverage

Coverage reports are generated in the `coverage/` directory:
- HTML report: `coverage/index.html`
- Text summary in terminal
- JSON data for CI/CD

## 🔄 Integration with Development

Tests can be integrated into your development workflow:
- Run `npm run test` during development for immediate feedback
- Use `npm run test:coverage` before committing to ensure adequate coverage
- Add a pre-commit hook to run tests automatically

## 🛠️ Troubleshooting

### Common Issues

1. **Component tests fail with import errors**
   - Verify that all dependencies are mocked in `tests/setup.ts`
   - Check alias configurations in `vitest.config.ts`

2. **Coverage not showing**
   - Ensure files are not excluded in `vitest.config.ts`
   - Check that tests are actually running

3. **TypeScript errors in tests**
   - Make sure `vitest/globals` types are included
   - Check that test files have proper imports

### Best Practices

1. **Mock external dependencies** in unit tests
2. **Test user interactions** in component tests
3. **Keep tests isolated** and independent
4. **Use descriptive test names** that explain the expected behavior
5. **Test edge cases** and error conditions
6. **Keep tests fast** by avoiding unnecessary DOM operations

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Documentation](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles) 