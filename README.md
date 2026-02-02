# Math Question Extractor 🧮

A modern, secure React application that leverages Google's **Gemini AI** to convert images of math problems (handwritten or printed) into editable, properly formatted Word documents (`.docx`).

> **Made with ❤️ by Rino**

<!-- ![App Preview](https://via.placeholder.com/800x400?text=Math+Extractor+Preview) *Add a screenshot here!* -->

## ✨ Features

-   **AI-Powered Extraction**: Uses Gemini generic multimodal capabilities to read complex math formulas, fractions, geometry symbols, and text.
-   **Smart Formatting**: Automatically converts LaTeX-style equations into native Word MathML for perfect rendering in `.docx`.
-   **Secure Authentication**: Client-side SHA-256 password protection to prevent unauthorized usage.
-   **Auto-Connection Check**: Verifies system status automatically.
-   **Responsive Design**: Fully optimized for mobile, tablet, and desktop interfaces.
-   **Custom Filenames**: Organize your downloads with custom file naming.

## 🛠️ Tech Stack

-   **Frontend**: React + Vite
-   **Styling**: Vanilla CSS (Variables, Responsive Media Queries)
-   **AI Integration**: Google Generative AI SDK (`@google/generative-ai`)
-   **Document Generation**: `docx` library
-   **Animations**: Framer Motion
-   **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/text2doc.git
    cd text2doc
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory. You can copy the structure below:

    ```env
    # Your Google Gemini API Key
    VITE_GEMINI_API_KEY=your_api_key_here

    # SHA-256 Hash of your access password.
    # Default hash below is for the password: "admin"
    VITE_AUTH_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
    ```

    *To generate a custom password hash, run:*
    ```bash
    echo -n "your_password" | sha256sum
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 🔒 Security

This application uses **Client-Side Hashing** for the "Auth Wall".
-   The password is **never** sent to a server (since this is a client-only app).
-   The input is hashed locally using `crypto.subtle` and compared against the `VITE_AUTH_PASSWORD_HASH` in your environment variables.
-   **Note**: While this prevents casual access, sensitive API keys are exposed in the frontend bundle. Restrict your API Key's usage quotas in the Google Cloud Console for production.

## 📂 Project Structure

```
src/
├── components/
│   ├── Login.jsx       # Auth wall component
│   └── FileUpload.jsx  # Drag & drop file handler
├── services/
│   ├── GeminiService.js # AI interaction logic
│   └── DocxGenerator.js # Word document generation logic (LaTeX parser)
├── App.jsx             # Main application state & UI
└── index.css           # Global themes & responsive styles
```

## 📄 License

This project is open source. Feel free to use it for personal or educational purposes.
