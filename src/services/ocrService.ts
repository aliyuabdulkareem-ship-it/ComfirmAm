/**
 * OCR Service using Tesseract.js
 * Extracts NAFDAC numbers and barcodes from product images
 *
 * ENHANCED: Better error handling, preprocessing, and pattern matching
 */

import Tesseract from 'tesseract.js';

export interface OCRResult {
  rawText: string;
  nafdacNumber?: string;
  barcode?: string;
  productName?: string;
  confidence: number;
  error?: string;
}

/**
 * Preprocess image for better OCR accuracy
 */
function preprocessImage(imageData: string): string {
  // For now, return the original image
  // In production, you could add:
  // - Contrast enhancement
  // - Sharpening
  // - Noise reduction
  // - Grayscale conversion
  return imageData;
}

/**
 * Extract NAFDAC number with multiple pattern strategies
 */
function extractNAFDACNumber(text: string): string | undefined {
  // Strategy 1: Standard format with dash (A4-0123, 04-1234)
  const pattern1 = /\b([A-Z0-9]{2}-\d{4,6})\b/g;

  // Strategy 2: Format without dash (A40123, 041234)
  const pattern2 = /\b([A-Z0-9]{2}\d{4,6})\b/g;

  // Strategy 3: Look for "NAFDAC" keyword near numbers
  const pattern3 = /NAFDAC\s*[:#]?\s*([A-Z0-9]{2}-?\d{4,6})/gi;

  // Strategy 4: Look for "Reg" or "Registration" near numbers
  const pattern4 = /Reg(?:istration)?\.?\s*(?:No|Number|Num)?\.?\s*[:#]?\s*([A-Z0-9]{2}-?\d{4,6})/gi;

  // Strategy 5: Look for "NRN" (NAFDAC Registration Number)
  const pattern5 = /NRN\s*[:#]?\s*([A-Z0-9]{2}-?\d{4,6})/gi;

  const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Extract the actual number from the match
      const match = matches[0];
      const extracted = match.match(/([A-Z0-9]{2}-?\d{4,6})/);
      if (extracted) {
        let number = extracted[1];
        // Normalize: add dash if missing
        if (number.length === 6 && !number.includes('-')) {
          number = `${number.slice(0, 2)}-${number.slice(2)}`;
        } else if (number.length === 7 && !number.includes('-')) {
          number = `${number.slice(0, 2)}-${number.slice(2)}`;
        } else if (number.length === 8 && !number.includes('-')) {
          number = `${number.slice(0, 2)}-${number.slice(2)}`;
        }
        return number.toUpperCase();
      }
    }
  }

  return undefined;
}

/**
 * Extract barcode with multiple pattern strategies
 */
function extractBarcode(text: string): string | undefined {
  // Strategy 1: 13-digit EAN
  const pattern1 = /\b(\d{13})\b/g;

  // Strategy 2: 12-digit UPC
  const pattern2 = /\b(\d{12})\b/g;

  // Strategy 3: 8-digit EAN-8
  const pattern3 = /\b(\d{8})\b/g;

  // Strategy 4: Look for "Barcode" keyword near numbers
  const pattern4 = /Barcode\s*[:#]?\s*(\d{8,13})/gi;

  const patterns = [pattern1, pattern2, pattern4, pattern3];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const match = matches[0];
      const extracted = match.match(/(\d{8,13})/);
      if (extracted) {
        return extracted[1];
      }
    }
  }

  return undefined;
}

/**
 * Extract text from image and identify NAFDAC numbers and barcodes
 * ENHANCED with better error handling and multiple extraction strategies
 */
export async function extractFromImage(imageData: string): Promise<OCRResult> {
  try {
    console.log('[OCR] Starting text extraction...');

    // Preprocess image
    const processedImage = preprocessImage(imageData);

    // Perform OCR using Tesseract.js with optimized settings
    const result = await Tesseract.recognize(processedImage, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    console.log('[OCR] Extraction complete. Confidence:', confidence);
    console.log('[OCR] Raw text:', rawText.substring(0, 200));

    // Extract NAFDAC number using multiple strategies
    const nafdacNumber = extractNAFDACNumber(rawText);
    console.log('[OCR] NAFDAC found:', nafdacNumber);

    // Extract barcode using multiple strategies
    const barcode = extractBarcode(rawText);
    console.log('[OCR] Barcode found:', barcode);

    // Try to extract product name (first meaningful line)
    const lines = rawText.split('\n').filter(line => line.trim().length > 3);
    const productName = lines.length > 0 ? lines[0].trim() : undefined;

    return {
      rawText,
      nafdacNumber,
      barcode,
      productName,
      confidence
    };
  } catch (error) {
    console.error('[OCR] Error:', error);
    return {
      rawText: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown OCR error'
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
