import { Document, Packer, Paragraph, TextRun, Math, MathRun, MathFraction, MathSuperScript, MathSubScript, MathRadical } from "docx";
import { saveAs } from "file-saver";

// Map common LaTeX symbols to Unicode for display in Math runs
const LATEX_SYMBOLS = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\theta': 'θ', '\\pi': 'π', '\\sigma': 'σ',
    '\\phi': 'φ', '\\Phi': 'Φ', '\\delta': 'δ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\Delta': 'Δ', '\\Omega': 'Ω',
    '\\ne': '≠', '\\neq': '≠', '\\le': '≤', '\\ge': '≥', '\\pm': '±', '\\approx': '≈',
    '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\infty': '∞',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔',
    '\\circ': '°', '\\degree': '°', '\\angle': '∠',
    '\\triangle': '△', '\\cong': '≅', '\\sim': '∽', '\\parallel': '∥', '\\perp': '⊥',
    '\\cup': '∪', '\\cap': '∩', '\\in': '∈', '\\subset': '⊂', '\\supset': '⊃',
    '\\forall': '∀', '\\exists': '∃',
    '\\sqrt': '', // Special case
    '\\frac': '', // Special case
};

// Helper: check if a char is a "single unit" for super/subscript purposes
// (simple approximation)
function isSingleChar(str) {
    return str.length === 1 && str.match(/[a-zA-Z0-9]/);
}

function parseLatexNodes(latex) {
    const nodes = [];
    let i = 0;

    // Helper to get text or group
    // Returns { content: "...", endIndex: N, isGroup: boolean }
    const getNextUnit = (idx) => {
        if (idx >= latex.length) return null;
        if (latex[idx] === '{') {
            const group = extractGroup(latex, idx);
            return { ...group, isGroup: true };
        } else if (latex[idx] === '\\') {
            // Command like \alpha or \frac
            // Find end of command
            let end = idx + 1;
            while (end < latex.length && /[a-zA-Z]/.test(latex[end])) {
                end++;
            }
            const cmd = latex.slice(idx, end);
            return { content: cmd, endIndex: end, isGroup: false };
        } else {
            return { content: latex[idx], endIndex: idx + 1, isGroup: false };
        }
    };

    while (i < latex.length) {
        const char = latex[i];

        if (char === ' ') {
            i++;
            continue;
        }

        if (char === '^' || char === '_') {
            // These should have been handled by the PREVIOUS node if strictly following AST, 
            // but since we are linear, we encounter them after the base.
            // In docx, we need to wrap the base. 
            // This suggests we should have a "current base" approach or post-process.
            // Let's rely on looking ahead method? No, look BACK.

            // Pop the last node to be the base.
            let base = nodes.pop();
            // If no base (e.g. start of string), implicit base? (empty)
            if (!base) base = new MathRun("");

            const isSuper = char === '^';
            const nextInfo = getNextUnit(i + 1);
            if (!nextInfo) break; // formatting error

            let scriptContent = nextInfo.content;
            // If it was a group {..}, we parse inside. If command, we use it. If char, use it.
            // But for recursive parsing, we need to parse the content if it's a group OR simply pass it?
            // Ideally we recursively parse the script content.

            const scriptChildren = parseLatexNodes(scriptContent);
            i = nextInfo.endIndex;

            if (isSuper) {
                nodes.push(new MathSuperScript({
                    children: Array.isArray(base) ? base : [base], // docx expects children for base? 
                    // Wait, docs say: new MathSuperScript({ children: [base], superScript: [exp] })
                    superScript: scriptChildren
                }));
            } else {
                nodes.push(new MathSubScript({
                    children: Array.isArray(base) ? base : [base],
                    subScript: scriptChildren
                }));
            }
            continue;
        }

        if (char === '\\') {
            const remaining = latex.slice(i);
            if (remaining.startsWith('\\frac')) {
                i += 5;
                const num = getNextUnit(i);
                i = num.endIndex;
                const den = getNextUnit(i);
                i = den.endIndex;

                nodes.push(new MathFraction({
                    numerator: parseLatexNodes(num.content),
                    denominator: parseLatexNodes(den.content)
                }));
                continue;
            }
            else if (remaining.startsWith('\\sqrt')) {
                i += 5;
                // sqrt usually takes an optional [n] and mandatory {arg}
                // Check if [ appears
                // Simple implementation: Just {arg}
                const rad = getNextUnit(i);
                i = rad.endIndex;

                nodes.push(new MathRadical({
                    children: parseLatexNodes(rad.content),
                    degree: [] // Default square root
                }));
                continue;
            }
            else {
                // Check simple symbols
                let end = i + 1;
                while (end < latex.length && /[a-zA-Z]/.test(latex[end])) {
                    end++;
                }
                const cmd = latex.slice(i, end);

                if (LATEX_SYMBOLS[cmd]) {
                    nodes.push(new MathRun(LATEX_SYMBOLS[cmd]));
                } else {
                    // Unknown command, just dump it as text or try to guess?
                    // e.g. \text{...}
                    nodes.push(new MathRun(cmd)); // Keeps \cmd potentially readable
                }
                i = end;
                continue;
            }
        }

        if (char === '{' || char === '}') {
            // Should only appear as part of structure, if here it's likely stray or parsing error
            i++;
            continue;
        }

        // Standard character
        nodes.push(new MathRun(char));
        i++;
    }
    return nodes;
}

// Helper to extract nested { ... }
function extractGroup(str, startIndex) {
    let start = str.indexOf('{', startIndex);
    // If not found at exactly startIndex (should be called when current is {), or found later...
    // Actually getNextUnit logic ensures we call this when valid.
    if (start === -1) return { content: "", endIndex: startIndex + 1 };

    let depth = 1;
    let end = start + 1;
    while (end < str.length && depth > 0) {
        if (str[end] === '{') depth++;
        else if (str[end] === '}') depth--;
        end++;
    }

    return {
        content: str.slice(start + 1, end - 1),
        endIndex: end
    };
}


const createMathParagraph = (text) => {
    const nodes = parseLatexNodes(text);
    return new Math({
        children: nodes
    });
};

export const generateWordDocument = async (content, filename = "Math_Questions") => {
    const lines = content.split('\n');

    const docChildren = lines.map(line => {
        if (line.startsWith('## ')) {
            return new Paragraph({
                children: [new TextRun({ text: line.replace('## ', ''), bold: true, size: 32 })],
                spacing: { before: 200, after: 100 }
            });
        }

        const parts = line.split(/\$([^$]+)\$/g);

        const paragraphChildren = parts.map((part, index) => {
            if (index % 2 === 1) {
                return createMathParagraph(part);
            } else {
                return new TextRun({ text: part, size: 24 });
            }
        });

        return new Paragraph({
            children: paragraphChildren,
            spacing: { before: 120, after: 120 }
        });
    });

    const doc = new Document({
        sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    const finalName = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    saveAs(blob, finalName);
};
