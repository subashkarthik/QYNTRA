# Contributing to QYNTRA

Thank you for your interest in contributing to QYNTRA! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/subashkarthik/QYNTRA/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (browser, OS, etc.)

### Suggesting Features

1. Check existing [Issues](https://github.com/subashkarthik/QYNTRA/issues) for similar suggestions
2. Create a new issue with:
   - Clear feature description
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant examples or mockups

### Pull Requests

1. **Fork the repository**

   ```bash
   git clone https://github.com/subashkarthik/QYNTRA.git
   cd QYNTRA
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**

   - Follow the existing code style
   - Write clear, concise commit messages
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**

   ```bash
   npm run dev  # Test locally
   npm run build  # Ensure it builds
   ```

5. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Keep components focused and reusable
- Use meaningful variable and function names

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:

```
feat: add dark mode toggle
fix: resolve search modal keyboard navigation
docs: update installation instructions
```

### File Structure

```
components/     # React components
services/       # Business logic and API calls
utils/          # Utility functions
types.ts        # TypeScript type definitions
constants.ts    # Application constants
```

### Component Guidelines

- Keep components under 300 lines
- Extract complex logic into custom hooks
- Use props interfaces for type safety
- Implement error boundaries where appropriate
- Make components accessible (ARIA labels, keyboard navigation)

### Service Guidelines

- Keep services focused on single responsibility
- Handle errors gracefully
- Add retry logic for API calls
- Use async/await for asynchronous operations
- Add JSDoc comments for public methods

## Testing

Before submitting a PR:

1. Test all affected features manually
2. Verify responsive design (mobile, tablet, desktop)
3. Check browser compatibility (Chrome, Firefox, Safari, Edge)
4. Ensure no console errors or warnings
5. Test with different API providers (Gemini, Groq)

## Documentation

When adding new features:

1. Update README.md if needed
2. Add JSDoc comments to functions
3. Update CHANGELOG.md
4. Create examples in code comments
5. Update type definitions

## Questions?

Feel free to:

- Open an issue for questions
- Reach out via email: subashkarthikeyan31@gmail.com
- Start a discussion in the repository

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to QYNTRA! 🚀
