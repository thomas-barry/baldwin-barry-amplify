# Contributing to Baldwin-Barry Photo Gallery

Thank you for your interest in contributing to this project! This guide will help you get started with development and understand our contribution workflow.

## Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/baldwin-barry-amplify.git
   cd baldwin-barry-amplify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up AWS credentials**
   ```bash
   aws sso login --profile bb-admin
   ```

4. **Start the development environment**
   ```bash
   # Terminal 1: Start Amplify sandbox
   npx ampx sandbox
   
   # Terminal 2: Start dev server
   npm run dev
   ```

## Development Guidelines

Please read our comprehensive coding guidelines in [`.github/copilot-instructions.md`](.github/copilot-instructions.md) before contributing. Key points:

### Code Style

- **TypeScript**: All code must be TypeScript with proper type safety
- **Components**: Use functional components with React hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Use path aliases (`@/components/...`) instead of relative imports
- **Styling**: Use CSS Modules for component-specific styles
- **State**: Use Tanstack Query for server state, React hooks for local state

### Before Submitting

1. **Lint your code**
   ```bash
   npm run lint
   ```

2. **Build successfully**
   ```bash
   npm run build
   ```

3. **Test your changes**
   - Manually test affected features in the browser
   - Ensure no console errors or warnings
   - Test both authenticated and unauthenticated states if applicable

4. **Write clear commit messages**
   - Use present tense ("Add feature" not "Added feature")
   - Be descriptive but concise
   - Reference issue numbers when applicable

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Keep changes focused and atomic
   - Follow the existing code style
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add clear description of changes"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a pull request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes

## Common Development Tasks

### Adding a New Component

1. Create component file: `src/components/MyComponent/MyComponent.tsx`
2. Create styles: `src/components/MyComponent/MyComponent.module.css`
3. Export from index: `src/components/MyComponent/index.ts`
4. Use path alias when importing: `import { MyComponent } from '@/components/MyComponent'`

### Adding a New Route

1. Create route file: `src/routes/my-route/index.tsx`
2. The route will be automatically picked up by Tanstack Router
3. Use `Link` component for navigation: `<Link to="/my-route">Link</Link>`

### Working with Amplify Data

1. Define schema in `amplify/data/resource.ts`
2. Use Tanstack Query for data fetching:
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { generateClient } from 'aws-amplify/data';
   
   const client = generateClient();
   
   function useMyData() {
     return useQuery({
       queryKey: ['myData'],
       queryFn: async () => {
         const { data } = await client.models.MyModel.list();
         return data;
       },
     });
   }
   ```

### Troubleshooting Build Issues

#### Missing amplify_outputs.json
Run the Amplify sandbox to generate it:
```bash
npx ampx sandbox
```

#### TypeScript errors in amplify/
Install Amplify dependencies:
```bash
cd amplify
npm install
cd ..
```

#### Module resolution errors
Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
/
├── src/
│   ├── components/     # Reusable UI components
│   ├── routes/         # File-based routing pages
│   ├── modules/        # Feature modules
│   ├── context/        # React Context providers
│   ├── lib/            # Utility functions
│   └── main.tsx        # Application entry point
├── amplify/            # Backend resource definitions
│   ├── auth/           # Cognito configuration
│   ├── data/           # DynamoDB schema
│   ├── storage/        # S3 configuration
│   └── backend.ts      # Backend setup
├── public/             # Static assets
└── .github/            # GitHub configuration
```

## Code Review Guidelines

When reviewing pull requests:

- ✅ Check for TypeScript type safety (no `any` types)
- ✅ Verify proper error handling in async operations
- ✅ Ensure CSS Modules are used for styling
- ✅ Confirm Tanstack Query is used for server state
- ✅ Check that path aliases are used correctly
- ✅ Verify no hardcoded sensitive data or credentials
- ✅ Ensure components are small and focused
- ✅ Check for proper loading and error states

## Security Issue Notifications

If you discover a security vulnerability, please do NOT open a public issue. Instead:

1. Email the maintainer directly
2. Provide a detailed description of the vulnerability
3. Include steps to reproduce if possible
4. Allow time for a fix before public disclosure

## Questions?

If you have questions about contributing:

1. Check the [README.md](README.md) for setup instructions
2. Review [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for coding guidelines
3. Open a discussion on GitHub
4. Reach out to the maintainers

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT-0 License.
