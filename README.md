# QYNTRA

<div align="center">
<img width="1200" height="475" alt="QYNTRA Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**QYNTRA** - An advanced AI intelligence engine built for developers. Precise, intelligent, and powerful.

## 🚀 Features

### Core Capabilities

- **Multi-Provider AI Support** - Seamlessly switch between Gemini and Groq
- **Advanced Personas** - Specialized AI modes for different tasks
- **Real-time Voice Interaction** - Live voice conversations with AI
- **Document RAG** - Upload documents for context-aware responses
- **AI Image Generation** - Create images with `/image` command

### New in Latest Release 🎉

- **Code Execution Sandbox** - Run JavaScript, HTML, and CSS directly in the browser
- **Conversation Search** - Find past conversations with fuzzy, semantic, and hybrid search
- **Multi-Modal Input** - Upload and analyze images with Gemini Vision

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI Providers**: Google Gemini, Groq
- **Code Execution**: WebContainer API
- **Search**: Fuse.js, Vector Embeddings
- **Styling**: Custom CSS with glassmorphism design

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/subashkarthik/QYNTRA.git
cd QYNTRA

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys to .env.local

# Run development server
npm run dev
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

## 🎯 Usage

### Code Execution

1. Ask QYNTRA to generate code
2. Hover over the code block
3. Click "Run Code" to execute in-browser

### Conversation Search

1. Click the search icon in the header (or press Ctrl+K)
2. Type your query
3. Choose search mode: Fuzzy, Semantic, or Hybrid
4. Click any result to navigate to that conversation

### Image Analysis

1. Click the attachment icon in the chat input
2. Upload an image (PNG, JPEG, WebP, HEIC)
3. Ask questions about the image
4. Get AI-powered visual analysis

### Voice Mode

1. Click the "Live" button in the header
2. Speak naturally to interact with AI
3. Get real-time voice responses

## 📚 Documentation

- **Personas**: Choose from specialized AI modes (Code Reviewer, System Architect, Debug Master, etc.)
- **Document RAG**: Upload PDFs and text files for context-aware conversations
- **Themes**: Switch between 5 beautiful color themes
- **Export/Import**: Save and restore conversation history

## 🏗️ Project Structure

```
QYNTRA/
├── components/          # React components
│   ├── ChatArea.tsx    # Main chat interface
│   ├── CodeExecutor.tsx # Code execution modal
│   ├── SearchModal.tsx  # Search interface
│   └── ...
├── services/           # Business logic
│   ├── geminiService.ts
│   ├── groqService.ts
│   ├── codeExecutionService.ts
│   ├── searchService.ts
│   └── visionService.ts
├── utils/              # Utility functions
└── types.ts            # TypeScript definitions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Subash Karthikeyan**

- GitHub: [@subashkarthik](https://github.com/subashkarthik)
- Email: subashkarthikeyan31@gmail.com

## 🙏 Acknowledgments

- Built with [Google Gemini AI](https://ai.google.dev/)
- Powered by [Groq](https://groq.com/)
- Code execution via [WebContainer](https://webcontainers.io/)

---

<div align="center">
Made with ❤️ by Subash Karthikeyan
</div>
