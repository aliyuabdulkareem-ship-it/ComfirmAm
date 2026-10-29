/**
 * Buycott API Service
 * Free product database with 642M+ products
 * URL: https://www.buycott.com/
 * No API key required for basic lookups!
 */

export interface BuycottProduct {
  id: string;
  name: string;
  brand: string;
  categories: string[];
  barcode: string;
  description?: string;
}

export interface BuycottSearchResult {
  found: boolean;
  product?: BuycottProduct;
  confidence: number;
  source: string;
  error?: string;
}

/**
 * Look up product by barcode using Buycott
 * Note: Buycott doesn't have a public API, so we use their search endpoint
 */
export async function lookupBuycottByBarcode(barcode: string): Promise<BuycottSearchResult> {
  try {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      return {
        found: false,
        confidence: 0,
        source: 'Buycott',
        error: 'Invalid barcode format'
      };
    }

    // Buycott doesn't have a public API, so we'll use UPC Database as alternative
    // UPC Database has a free tier that works without API key for basic lookups
    const response = await fetch(
      `https://api.upcdatabase.org/product/${cleanBarcode}`,
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
        source: 'UPC Database',
        error: `API returned status ${response.status}`
      };
    }

    const data = await response.json();

    if (!data || data.title === 'Invalid UPC') {
      return {
        found: false,
        confidence: 0,
        source: 'UPC Database',
        error: 'Product not found in UPC Database'
      };
    }

    return {
      found: true,
      product: {
        id: cleanBarcode,
        name: data.title || data.name || 'Unknown Product',
        brand: data.brand || 'Unknown',
        categories: data.category ? [data.category] : [],
        barcode: cleanBarcode,
        description: data.description
      },
      confidence: 85,
      source: 'UPC Database'
    };

  } catch (error) {
    console.error('[UPC Database] Error:', error);
    return {
      found: false,
      confidence: 0,
      source: 'UPC Database',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}
