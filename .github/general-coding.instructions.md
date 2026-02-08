---
applyTo: '**/*.ts,**/*.tsx'
---

# Project coding standards for TypeScript and React

Apply the repository-wide coding standards from [copilot-instructions.md](./copilot-instructions.md) to all code.

## TypeScript Guidelines

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- Avoid `any` type, use `unknown` if type is truly unknown
- Always enable strict mode in TypeScript configuration

## React Guidelines

- Use functional components with hooks (no class components)
- Follow the React hooks rules (no conditional hooks, hooks at top level)
- Use React.FC type for components with children
- Keep components small and focused (single responsibility)
- Use CSS modules for component-specific styling
- Implement proper error boundaries for error handling
- Use memo, useCallback, and useMemo for performance optimization when needed

## Testing Guidelines

- Write tests for critical business logic
- Use React Testing Library for component tests
- Ensure tests are maintainable and readable
- Mock external dependencies and API calls
