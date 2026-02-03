import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads an Excel file from JSON data.
 * @param {string} extractedJson - The JSON string returned by the AI.
 * @param {string} fileName - The desired name for the downloaded file.
 */
export async function generateExcelDocument(extractedJson, fileName = 'Converted Data') {
    try {
        const data = parseJson(extractedJson);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');

        populateWorksheet(worksheet, data);

        // Write buffer and trigger download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        saveAs(blob, `${fileName}.xlsx`);

    } catch (error) {
        console.error("Excel Generation Error:", error);
        throw error;
    }
}

/**
 * Parses and validates the input JSON string.
 * @param {string} jsonString 
 * @returns {Array<Array<string>>} Parsed data array
 */
function parseJson(jsonString) {
    try {
        // Remove potential markdown fences from AI response
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);

        if (!Array.isArray(data)) {
            throw new Error("Data is not in the expected array format");
        }
        return data;
    } catch (e) {
        console.error("Failed to parse JSON for Excel:", e);
        alert("Failed to parse the extracted data into a valid Excel format. Raw text will be downloaded instead.");
        throw new Error("Invalid JSON format from AI");
    }
}

/**
 * Populates the worksheet with data and applies styling.
 * @param {ExcelJS.Worksheet} worksheet 
 * @param {Array<Array<any>>} data 
 */
function populateWorksheet(worksheet, data) {
    const colWidths = [];

    data.forEach((rowData, rowIndex) => {
        if (!Array.isArray(rowData)) return;

        // Header (Row 0): Format as ALL CAPS
        const processedRow = rowIndex === 0
            ? rowData.map(cell => String(cell || '').toUpperCase())
            : rowData;

        const row = worksheet.addRow(processedRow);

        row.eachCell((cell, colNumber) => {
            trackColumnWidth(colWidths, colNumber, cell.value);
            applyCellStyle(cell, rowIndex === 0);
        });
    });

    applyColumnWidths(worksheet, colWidths);
}

/**
 * Updates the maximum width for a given column.
 * @param {number[]} colWidths 
 * @param {number} colNumber 
 * @param {any} cellValue 
 */
function trackColumnWidth(colWidths, colNumber, cellValue) {
    const cellLength = cellValue ? String(cellValue).length : 0;
    if (!colWidths[colNumber] || cellLength > colWidths[colNumber]) {
        colWidths[colNumber] = cellLength;
    }
}

/**
 * Applies standard styling to a cell.
 * @param {ExcelJS.Cell} cell 
 * @param {boolean} isHeader 
 */
function applyCellStyle(cell, isHeader) {
    cell.font = {
        name: 'Times New Roman',
        size: 12,
        bold: isHeader
    };

    cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
    };

    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
}

/**
 * Applies calculated widths to worksheet columns with constraints.
 * @param {ExcelJS.Worksheet} worksheet 
 * @param {number[]} colWidths 
 */
function applyColumnWidths(worksheet, colWidths) {
    // Note: colWidths is sparse/1-based index
    for (let i = 1; i < colWidths.length; i++) {
        const col = worksheet.getColumn(i);
        const contentWidth = colWidths[i] || 10;
        // Min width 12, Max width 60, +2 padding
        col.width = Math.min(Math.max(contentWidth + 2, 12), 60);
    }
}
