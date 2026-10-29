/**
 * Open Beauty Facts API Service
 * Free, open database for cosmetics and personal care products
 * URL: https://world.openbeautyfacts.org/
 * No API key required!
 */

export interface BeautyProduct {
  code: string;
  product_name: string;
  brands: string;
  categories: string;
  ingredients_text: string;
  image_url: string;
  quantity: string;
  countries: string;
}

export interface BeautySearchResult {
  found: boolean;
  product?: BeautyProduct;
  confidence: number;
  source: string;
  error?: string;
}

/**
 * Look up cosmetic product by barcode
 */
export async function lookupBeautyByBarcode(barcode: string): Promise<BeautySearchResult> {
  try {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      return {
        found: false,
        confidence: 0,
        source: 'Open Beauty Facts',
        error: 'Invalid barcode format'
      };
    }

    const response = await fetch(
      `https://world.openbeautyfacts.org/api/v2/product/${cleanBarcode}.json`,
      {
        headers: {
          'User-Agent': 'ConfirmAm/2.1 (Nigerian Product Verification App)'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return {
        found: false,
        confidence: 0,
        source: 'Open Beauty Facts',
        error: `API returned status ${response.status}`
      };
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return {
        found: false,
        confidence: 0,
        source: 'Open Beauty Facts',
        error: 'Product not found in Open Beauty Facts database'
      };
    }

    // Calculate confidence
    let confidence = 50;
    if (data.product.product_name) confidence += 10;
    if (data.product.brands) confidence += 10;
    if (data.product.ingredients_text) confidence += 10;
    if (data.product.image_url) confidence += 10;

    return {
      found: true,
      product: data.product,
      confidence: Math.min(confidence, 90),
      source: 'Open Beauty Facts'
    };

  } catch (error) {
    console.error('[Open Beauty Facts] Error:', error);
    return {
      found: false,
      confidence: 0,
      source: 'Open Beauty Facts',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}
