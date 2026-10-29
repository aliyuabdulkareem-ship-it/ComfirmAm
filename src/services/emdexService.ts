/**
 * EMDEX API Service
 * Nigeria's Essential Medicines Index - 15,000+ registered pharmaceuticals
 * API: http://api.emdex.org/
 */

export interface EMDEXProduct {
  id: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  nafdacNumber: string;
  dosageForm: string;
  strength: string;
  category: string;
  status: string;
}

export interface EMDEXSearchResult {
  found: boolean;
  product?: EMDEXProduct;
  confidence: number;
  source: string;
  error?: string;
}

const EMDEX_API_BASE = 'http://api.emdex.org';

/**
 * Search for pharmaceutical product in EMDEX database
 */
export async function searchEMDEX(query: string): Promise<EMDEXSearchResult> {
  try {
    // Try searching by NAFDAC number first
    const response = await fetch(`${EMDEX_API_BASE}/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return {
        found: false,
        confidence: 0,
        source: 'EMDEX',
        error: `API returned status ${response.status}`
      };
    }

    const data = await response.json();

    // EMDEX API response format (adjust based on actual API)
    if (data && data.products && data.products.length > 0) {
      const product = data.products[0];
      return {
        found: true,
        product: {
          id: product.id || '',
          brandName: product.brand_name || product.brandName || '',
          genericName: product.generic_name || product.genericName || '',
          manufacturer: product.manufacturer || '',
          nafdacNumber: product.nafdac_number || product.nafdacNumber || '',
          dosageForm: product.dosage_form || product.dosageForm || '',
          strength: product.strength || '',
          category: product.category || 'Pharmaceutical',
          status: product.status || 'Active'
        },
        confidence: 95,
        source: 'EMDEX'
      };
    }

    return {
      found: false,
      confidence: 0,
      source: 'EMDEX',
      error: 'Product not found in EMDEX database'
    };
  } catch (error) {
    console.error('EMDEX API Error:', error);
    return {
      found: false,
      confidence: 0,
      source: 'EMDEX',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Verify pharmaceutical by NAFDAC number
 */
export async function verifyByNafdac(nafdacNumber: string): Promise<EMDEXSearchResult> {
  return searchEMDEX(nafdacNumber);
}

/**
 * Verify pharmaceutical by brand name
 */
export async function verifyByBrandName(brandName: string): Promise<EMDEXSearchResult> {
  return searchEMDEX(brandName);
}
