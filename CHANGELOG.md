# Changelog

All notable changes to QYNTRA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-03

### Added

- **Code Execution Sandbox**: Run JavaScript, HTML, and CSS code directly in the browser

  - WebContainer integration for safe code execution
  - Live preview for HTML/CSS/JS
  - Console output display
  - Syntax highlighting with react-syntax-highlighter
  - "Run Code" button on all executable code blocks

- **Conversation Search**: Find past conversations with advanced search

  - Fuzzy search mode for fast text matching
  - Semantic search using AI embeddings
  - Hybrid search combining both approaches
  - Search modal with keyboard shortcut (Ctrl+K)
  - Result highlighting and similarity scores

- **Multi-Modal Input**: Upload and analyze images with AI
  - Image upload with drag-and-drop support
  - Automatic image compression for large files
  - Gemini Vision API integration
  - Support for PNG, JPEG, WebP, HEIC, HEIF
  - Multi-image support (up to 5 images per message)

### Changed

- Enhanced `MessageItem` component with code execution capabilities
- Updated `App.tsx` with search modal integration
- Extended type definitions for execution results and image attachments
- Added vision model (`gemini-2.0-flash-exp`) to provider configurations

### Dependencies

- Added `@webcontainer/api` ^1.1.9
- Added `fuse.js` ^7.0.0
- Added `react-syntax-highlighter` ^15.5.0
- Added `@types/react-syntax-highlighter` ^15.5.13

## [1.0.0] - 2025-12-17

### Added

- Initial release of QYNTRA
- Multi-provider AI support (Gemini, Groq)
- Advanced persona system
- Real-time voice interaction
- Document RAG with vector search
- AI image generation with `/image` command
- Session management and history
- Theme customization (5 themes)
- Export/Import conversations
- API key rotation for rate limit handling

### Features

- Chat interface with streaming responses
- Code syntax highlighting
- Markdown rendering
- Grounding metadata display
- Mobile-responsive design
- Glassmorphism UI design
