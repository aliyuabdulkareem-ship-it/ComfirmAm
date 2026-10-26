/**
 * Open Food Facts API Client
 *
 * FREE API - No API key required!
 * Works directly from the browser (CORS enabled)
 * Coverage: 4+ million food products globally
 * Documentation: https://wiki.openfoodfacts.org/API/Read/Product
 */

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  countries: string;
  manufacturing_places: string;
  ingredients_text: string;
  image_url: string;
  quantity: string;
  categories: string;
  labels: string;
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product: OpenFoodFactsProduct | null;
}

export interface BarcodeLookupResult {
  found: boolean;
  product: OpenFoodFactsProduct | null;
  source: string;
  confidence: number;
  error?: string;
}

/**
 * Look up a product by barcode (EAN/UPC/GTIN)
 */
export async function lookupByBarcode(barcode: string): Promise<BarcodeLookupResult> {
  try {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');

    if (!cleanBarcode || cleanBarcode.length < 8) {
      return {
        found: false,
        product: null,
        source: 'Open Food Facts',
        confidence: 0,
        error: 'Invalid barcode format'
      };
    }

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
      {
        headers: {
          'User-Agent': 'ConfirmAm/2.0 (Nigerian Product Verification App)'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return {
        found: false,
        product: null,
        source: 'Open Food Facts',
        confidence: 0,
        error: `API returned status ${response.status}`
      };
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status === 0 || !data.product) {
      return {
        found: false,
        product: null,
        source: 'Open Food Facts',
        confidence: 0,
        error: 'Product not found in Open Food Facts database'
      };
    }

    // Calculate confidence based on data completeness
    let confidence = 50;
    if (data.product.product_name) confidence += 10;
    if (data.product.brands) confidence += 10;
    if (data.product.manufacturing_places) confidence += 10;
    if (data.product.image_url) confidence += 10;
    if (data.product.categories) confidence += 5;

    return {
      found: true,
      product: data.product,
      source: 'Open Food Facts',
      confidence: Math.min(confidence, 95)
    };

  } catch (error) {
    console.error('[OpenFoodFacts] Error:', error);
    return {
      found: false,
      product: null,
      source: 'Open Food Facts',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}
