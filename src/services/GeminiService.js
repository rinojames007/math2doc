import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function extractContentFromFiles(apiKey, files) {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Prioritize 2.5 flash/pro, then 2.0.
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash"
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting to use model: ${modelName}`);

            // Explicitly getting model (validate availability if possible?)
            // The SDK doesn't validate until you call generateContent usually.
            const model = genAI.getGenerativeModel({ model: modelName });

            const fileParts = await Promise.all(files.map(fileToPart));

            const prompt = `
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

            const result = await model.generateContent([prompt, ...fileParts]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.warn(`Failed with model ${modelName}:`, error);
            lastError = error;

            // If it's a 404 (Not Found), it means this specific model isn't available for this key.
            // We continue to the next model.
            // If it's a 400 (InvalidArgument) or 403 (Permission), we might want to stop or also try others?
            // For now, continue loop.
        }
    }

    throw lastError || new Error("All model attempts failed. Please check your API key.");
}
