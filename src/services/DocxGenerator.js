import { Document, Packer, Paragraph, TextRun, Math, MathRun, MathFraction, MathSuperScript, MathSubScript, MathRadical } from "docx";
import { saveAs } from "file-saver";

/**
 * Mapping of LaTeX symbols to their Unicode equivalents for display in Math runs.
 */
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
    '\\sqrt': '',
    '\\frac': '',
};

/**
 * Parses a LaTeX string into an array of Docx Math nodes.
 * @param {string} latex 
 * @returns {Array} Array of docx math objects
 */
function parseLatexNodes(latex) {
    const nodes = [];
    let i = 0;

    /**
     * Extracts the next logical unit from the latex string.
     * @param {number} idx 
     * @returns {{content: string, endIndex: number, isGroup: boolean} | null}
     */
    const getNextUnit = (idx) => {
        if (idx >= latex.length) return null;
        if (latex[idx] === '{') {
            const group = extractGroup(latex, idx);
            return { ...group, isGroup: true };
        } else if (latex[idx] === '\\') {
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

        // Superscript/Subscript Handling
        if (char === '^' || char === '_') {
            let base = nodes.pop();
            if (!base) base = new MathRun("");

            const isSuper = char === '^';
            const nextInfo = getNextUnit(i + 1);
            if (!nextInfo) break;

            const scriptChildren = parseLatexNodes(nextInfo.content);
            i = nextInfo.endIndex;

            const ScriptClass = isSuper ? MathSuperScript : MathSubScript;
            const scriptProp = isSuper ? { superScript: scriptChildren } : { subScript: scriptChildren };

            // Note: docx MathSuperScript/SubScript expects 'children' for the base property.
            nodes.push(new ScriptClass({
                children: Array.isArray(base) ? base : [base],
                ...scriptProp
            }));
            continue;
        }

        // Command Handling
        if (char === '\\') {
            const remaining = latex.slice(i);

            if (remaining.startsWith('\\frac')) {
                i += 5; // length of \frac
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
                i += 5; // length of \sqrt
                const rad = getNextUnit(i);
                i = rad.endIndex;

                nodes.push(new MathRadical({
                    children: parseLatexNodes(rad.content),
                    degree: []
                }));
                continue;
            }
            else {
                // Generic Symbol or Command
                let end = i + 1;
                while (end < latex.length && /[a-zA-Z]/.test(latex[end])) {
                    end++;
                }
                const cmd = latex.slice(i, end);

                if (LATEX_SYMBOLS[cmd]) {
                    nodes.push(new MathRun(LATEX_SYMBOLS[cmd]));
                } else {
                    nodes.push(new MathRun(cmd));
                }
                i = end;
                continue;
            }
        }

        if (char === '{' || char === '}') {
            i++;
            continue;
        }

        // Default Character
        nodes.push(new MathRun(char));
        i++;
    }
    return nodes;
}

/**
 * Extracts content within balanced curly braces.
 * @param {string} str 
 * @param {number} startIndex 
 * @returns {{content: string, endIndex: number}}
 */
function extractGroup(str, startIndex) {
    let start = str.indexOf('{', startIndex);
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

/**
 * Creates a docx Math object from a LaTeX string.
 * @param {string} text 
 * @returns {Math}
 */
const createMathParagraph = (text) => {
    const nodes = parseLatexNodes(text);
    return new Math({
        children: nodes
    });
};

/**
 * Generates and downloads a Word Document (.docx).
 * @param {string} content - Markdown/LaTeX content.
 * @param {string} filename 
 */
export const generateWordDocument = async (content, filename = "Math_Questions") => {
    const lines = content.split('\n');

    const docChildren = lines.map(line => {
        // Heading detection (Markdown style)
        if (line.startsWith('## ')) {
            return new Paragraph({
                children: [new TextRun({ text: line.replace('## ', ''), bold: true, size: 32 })],
                spacing: { before: 200, after: 100 }
            });
        }

        // Split text by inline math delimiters $...$
        const parts = line.split(/\$([^$]+)\$/g);

        const paragraphChildren = parts.map((part, index) => {
            // Odd indices are math content
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
