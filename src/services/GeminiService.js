import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Models to attempt using, in order of priority.
 * We prioritize newer/faster models.
 */
const MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash"
];

/**
 * Converts a File object to a GoogleGenerativeAI Part object.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
const fileToPart = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Lists available models associated with the API key.
 * @param {string} apiKey 
 * @returns {Promise<Array>} List of models
 */
export async function listAvailableModels(apiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error("Failed to list models:", error);
        throw error;
    }
}

/**
 * Extracts content from uploaded files using Gemini models.
 * Retries with fallback models if the primary one fails.
 * 
 * @param {string} apiKey 
 * @param {File[]} files 
 * @param {'docx'|'excel'} format 
 * @returns {Promise<string>} Extracted text or JSON string
 */
export async function extractContentFromFiles(apiKey, files, format = 'docx') {
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`Attempting generation with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const fileParts = await Promise.all(files.map(fileToPart));

            const prompt = format === 'excel'
                ? getExcelPrompt()
                : getMathPrompt();

            const result = await model.generateContent([prompt, ...fileParts]);
            const response = result.response;
            return response.text();

        } catch (error) {
            console.warn(`Model ${modelName} failed, retrying with next available...`, error);
            lastError = error;
            // Continue to next model in the list
        }
    }

    throw lastError || new Error("All model attempts failed. Please verify your API key and connection.");
}

function getExcelPrompt() {
    return `
    You are an expert Data Entry assistant. Your task is to extract tabular data and text from provided images into a structured JSON format.

    Rules:
    1. Identify tables, lists, or structured data in the image.
    2. Extract the content into a JSON array of arrays, representing rows and columns.
       Example: [ ["Header 1", "Header 2"], ["Row 1 Col 1", "Row 1 Col 2"] ]
    3. Do NOT include complex mathematical equations. If minor math is present, treat it as plain text.
    4. If there is no clear table, try to structure the text logically into rows.
    5. Do NOT output markdown code fences. Just raw JSON.
    `;
}

function getMathPrompt() {
    return `
    You are an expert Math assistant. Your task is to extract questions and mathematical equations entirely and accurately from the provided images of question papers.
    
    Rules:
    1. Extract all text exactly as it appears.
    2. For mathematical equations, represent them in standard LaTeX format enclosed in single dollar signs like $E = mc^2$.
       - USE standard LaTeX commands: \\frac{a}{b}, x^2, x_i, \\sqrt{x}, etc.
       - Do NOT use double dollar signs $$.
    3. For fractions, ALWAYS use \\frac{numerator}{denominator}.
    4. Maintain the question structure/numbering.
    5. Do NOT output markdown code fences. Just raw text.
    `;
}
