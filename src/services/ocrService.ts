/**
 * OCR Service using Tesseract.js
 * Extracts NAFDAC numbers and barcodes from product images
 */

import Tesseract from 'tesseract.js';

export interface OCRResult {
  rawText: string;
  nafdacNumber?: string;
  barcode?: string;
  productName?: string;
  confidence: number;
}

/**
 * Extract text from image and identify NAFDAC numbers and barcodes
 */
export async function extractFromImage(imageData: string): Promise<OCRResult> {
  try {
    // Perform OCR using Tesseract.js
    const result = await Tesseract.recognize(imageData, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    // Extract NAFDAC number (format: A4-0123, 04-1234, B4-5678, etc.)
    const nafdacPattern = /\b([A-Z0-9]{2}-\d{4,6})\b/g;
    const nafdacMatches = rawText.match(nafdacPattern);
    const nafdacNumber = nafdacMatches ? nafdacMatches[0] : undefined;

    // Extract barcode (13-digit EAN or 12-digit UPC)
    const barcodePattern = /\b(\d{12,13})\b/g;
    const barcodeMatches = rawText.match(barcodePattern);
    const barcode = barcodeMatches ? barcodeMatches[0] : undefined;

    // Try to extract product name (first line or prominent text)
    const lines = rawText.split('\n').filter(line => line.trim().length > 0);
    const productName = lines.length > 0 ? lines[0].trim() : undefined;

    return {
      rawText,
      nafdacNumber,
      barcode,
      productName,
      confidence
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      rawText: '',
      confidence: 0
    };
  }
}

/**
 * Validate if extracted NAFDAC number format is correct
 */
export function validateNafdacFormat(nafdacNumber: string): boolean {
  const pattern = /^[A-Z0-9]{2}-\d{4,6}$/;
  return pattern.test(nafdacNumber);
}

/**
 * Validate if extracted barcode format is correct
 */
export function validateBarcodeFormat(barcode: string): boolean {
  // EAN-13 or UPC-12
  return /^\d{12,13}$/.test(barcode);
}
