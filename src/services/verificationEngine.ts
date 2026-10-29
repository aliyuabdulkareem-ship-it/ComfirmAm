/**
 * Multi-Source Verification Engine
 * 
 * Coordinates verification across multiple data sources:
 * 1. Open Food Facts API (free, works for food/beverages)
 * 2. Open Beauty Facts API (free, works for cosmetics)
 * 3. UPC Database (free, barcode lookup)
 * 4. Go-UPC API (barcode lookup via serverless proxy)
 * 5. NAFDAC Greenbook (via serverless proxy)
 * 6. EMDEX API (pharmaceuticals - 15,000+ drugs)
 * 7. Apify NAFDAC Scraper (packaged foods, water, cosmetics)
 * 8. Local mock database (fallback - ONLY for testing)
 */

import { lookupByBarcode } from './openFoodFacts';
import { lookupBeautyByBarcode } from './openBeautyFactsService';
import { lookupBuycottByBarcode } from './buycottService';
import { verifyByNafdac as searchEMDEXAPI } from './emdexService';
import { searchByNRN as searchApifyNAFDACAPI } from './apifyNafdacService';

// ============================================================================
// TYPES
// ============================================================================

export type VerificationStatus = 'safe' | 'warning' | 'counterfeit' | 'pending';
export type ProductCategory = 'pharmaceutical' | 'cosmetics' | 'food' | 'beverage' | 'water' | 'household' | 'other';

export interface SourceResult {
  id: string;
  name: string;
  status: 'found' | 'not_found' | 'error' | 'skipped';
  confidence: number;
  productName?: string;
  manufacturer?: string;
  category?: string;
  details?: string;
  error?: string;
  icon: string;
}

export interface VerificationInput {
  nafdacNumber?: string;
  barcode?: string;
  productName?: string;
}

export interface VerificationResult {
  overallStatus: VerificationStatus;
  overallConfidence: number;
  productName?: string;
  manufacturer?: string;
  category?: ProductCategory;
  nafdacNumber?: string;
  barcode?: string;
  sources: SourceResult[];
  timestamp: Date;
  recommendations: string[];
  details: {
    nafdacFormatValid: boolean;
    nafdacPrefixCategory?: string;
    sourcesChecked: number;
    sourcesFound: number;
    crossReferenceMatch: boolean;
  };
}

// ============================================================================
// NAFDAC FORMAT VALIDATION
// ============================================================================

const NAFDAC_PREFIX_MAP: Record<string, { category: string; label: string }> = {
  'A0': { category: 'chemicals', label: 'Chemicals' },
  '00': { category: 'chemicals', label: 'Chemicals' },
  'A1': { category: 'food', label: 'Food Products' },
  '01': { category: 'food', label: 'Food Products' },
  'A2': { category: 'water', label: 'Packaged Water' },
  '02': { category: 'water', label: 'Packaged Water' },
  'A3': { category: 'medical_devices', label: 'Medical Devices' },
  '03': { category: 'medical_devices', label: 'Medical Devices' },
  'A4': { category: 'pharmaceutical', label: 'Drugs (Local)' },
  '04': { category: 'pharmaceutical', label: 'Drugs (Local)' },
  'A5': { category: 'cosmetics', label: 'Cosmetics' },
  '05': { category: 'cosmetics', label: 'Cosmetics' },
  'A6': { category: 'household', label: 'Detergents/Insecticides' },
  '06': { category: 'household', label: 'Detergents/Insecticides' },
  'A7': { category: 'herbals', label: 'Herbals/Nutraceuticals' },
  '07': { category: 'herbals', label: 'Herbals/Nutraceuticals' },
  'B4': { category: 'pharmaceutical', label: 'Drugs (Imported)' },
  'C4': { category: 'cosmetics', label: 'Cosmetics' },
};

export function validateNafdacFormat(nafdacNumber: string): {
  valid: boolean;
  normalized: string;
  prefix?: string;
  category?: string;
  categoryLabel?: string;
} {
  if (!nafdacNumber) {
    return { valid: false, normalized: '' };
  }

  const cleaned = nafdacNumber.trim().toUpperCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([A-Z0-9]{2})-?(\d{4,8})$/);
  
  if (!match) {
    return { valid: false, normalized: cleaned };
  }

  const prefix = match[1];
  const prefixInfo = NAFDAC_PREFIX_MAP[prefix];

  return {
    valid: true,
    normalized: cleaned.includes('-') ? cleaned : `${prefix}-${match[2]}`,
    prefix,
    category: prefixInfo?.category,
    categoryLabel: prefixInfo?.label || 'Unknown Category'
  };
}

// ============================================================================
// MOCK NAFDAC DATABASE (Testing Only - NOT used in production)
// ============================================================================

interface MockProduct {
  nafdacNumber: string;
  productName: string;
  manufacturer: string;
  category: ProductCategory;
  barcode?: string;
}

// This is ONLY for testing when APIs are unavailable
// In production, this should be empty or removed
const MOCK_DATABASE: MockProduct[] = [
  // Test data only - remove in production
];

function lookupMockDatabase(nafdacNumber?: string, barcode?: string): MockProduct | null {
  // DISABLED: Don't use mock database in production
  // This was causing false positives (always returning Emzor)
  return null;
}

// ============================================================================
// SERVERLESS API CALLS
// ============================================================================

async function verifyNafdacGreenbook(nafdacNumber: string): Promise<SourceResult> {
  try {
    const response = await fetch(`/api/verify-nafdac?number=${encodeURIComponent(nafdacNumber)}`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      const mock = lookupMockDatabase(nafdacNumber);
      if (mock) {
        return {
          id: 'nafdac_greenbook',
          name: 'NAFDAC Registry (Cached)',
          status: 'found',
          confidence: 85,
          productName: mock.productName,
          manufacturer: mock.manufacturer,
          category: mock.category,
          details: `Found in local database: ${mock.productName}`,
          icon: '🏛️'
        };
      }
      return {
        id: 'nafdac_greenbook',
        name: 'NAFDAC Registry',
        status: 'not_found',
        confidence: 0,
        details: 'Product not found in NAFDAC registry',
        icon: '🏛️'
      };
    }

    const data = await response.json();
    
    if (data.found) {
      return {
        id: 'nafdac_greenbook',
        name: 'NAFDAC Greenbook',
        status: 'found',
        confidence: 95,
        productName: data.productName,
        manufacturer: data.manufacturer,
        category: data.category,
        details: `Verified on NAFDAC Greenbook. Status: ${data.status || 'Active'}`,
        icon: '🏛️'
      };
    } else {
      return {
        id: 'nafdac_greenbook',
        name: 'NAFDAC Greenbook',
        status: 'not_found',
        confidence: 0,
        details: data.error || 'Product not found in NAFDAC Greenbook',
        icon: '🏛️'
      };
    }
  } catch (error) {
    const mock = lookupMockDatabase(nafdacNumber);
    if (mock) {
      return {
        id: 'nafdac_greenbook',
        name: 'NAFDAC Registry (Cached)',
        status: 'found',
        confidence: 80,
        productName: mock.productName,
        manufacturer: mock.manufacturer,
        category: mock.category,
        details: `Found in local database (online registry unavailable)`,
        icon: '🏛️'
      };
    }
    
    return {
      id: 'nafdac_greenbook',
      name: 'NAFDAC Registry',
      status: 'error',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Network error',
      details: 'Could not reach NAFDAC registry',
      icon: '🏛️'
    };
  }
}

async function verifyBarcodeGoUpc(barcode: string): Promise<SourceResult> {
  try {
    const response = await fetch(`/api/verify-barcode?code=${encodeURIComponent(barcode)}`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return {
        id: 'go_upc',
        name: 'Barcode Database',
        status: 'skipped',
        confidence: 0,
        details: 'Barcode verification service unavailable',
        icon: '📊'
      };
    }

    const data = await response.json();
    
    if (data.found) {
      return {
        id: 'go_upc',
        name: data.source === 'open_food_facts' ? 'Open Food Facts' : 'Go-UPC Database',
        status: 'found',
        confidence: 85,
        productName: data.productName,
        manufacturer: data.manufacturer,
        category: data.category,
        details: `Barcode verified. Product: ${data.productName}`,
        icon: data.source === 'open_food_facts' ? '🥫' : '📊'
      };
    } else {
      return {
        id: 'go_upc',
        name: 'Barcode Database',
        status: 'not_found',
        confidence: 0,
        details: 'Barcode not found in global database',
        icon: '📊'
      };
    }
  } catch (error) {
    return {
      id: 'go_upc',
      name: 'Barcode Database',
      status: 'error',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Network error',
      icon: '📊'
    };
  }
}

// ============================================================================
// EMDEX API VERIFICATION (Pharmaceuticals)
// ============================================================================

async function verifyEMDEXSource(nafdacNumber: string): Promise<SourceResult> {
  try {
    const result = await searchEMDEXAPI(nafdacNumber);
    
    if (result.found && result.product) {
      return {
        id: 'emdex',
        name: 'EMDEX (Pharma)',
        status: 'found',
        confidence: result.confidence,
        productName: result.product.brandName,
        manufacturer: result.product.manufacturer,
        category: 'pharmaceutical',
        details: `Verified in EMDEX: ${result.product.brandName} (${result.product.genericName})`,
        icon: '💊'
      };
    } else {
      return {
        id: 'emdex',
        name: 'EMDEX (Pharma)',
        status: 'not_found',
        confidence: 0,
        details: result.error || 'Product not found in EMDEX database',
        icon: '💊'
      };
    }
  } catch (error) {
    return {
      id: 'emdex',
      name: 'EMDEX (Pharma)',
      status: 'error',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Network error',
      icon: '💊'
    };
  }
}

// ============================================================================
// APIFY NAFDAC SCRAPER (Packaged Foods, Water, Cosmetics)
// ============================================================================

async function verifyApifyNAFDACSource(nafdacNumber: string): Promise<SourceResult> {
  try {
    const result = await searchApifyNAFDACAPI(nafdacNumber);
    
    if (result.found && result.product) {
      return {
        id: 'apify_nafdac',
        name: 'NAFDAC Registry (Apify)',
        status: 'found',
        confidence: result.confidence,
        productName: result.product.productName,
        manufacturer: result.product.manufacturer,
        category: result.product.category.toLowerCase() as ProductCategory,
        details: `Verified in NAFDAC Registry: ${result.product.productName} (${result.product.status})`,
        icon: '🏛️'
      };
    } else {
      return {
        id: 'apify_nafdac',
        name: 'NAFDAC Registry (Apify)',
        status: 'not_found',
        confidence: 0,
        details: result.error || 'Product not found in NAFDAC registry',
        icon: '🏛️'
      };
    }
  } catch (error) {
    return {
      id: 'apify_nafdac',
      name: 'NAFDAC Registry (Apify)',
      status: 'error',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Network error',
      icon: '🏛️'
    };
  }
}

// ============================================================================
// MAIN VERIFICATION ENGINE
// ============================================================================

export async function runMultiSourceVerification(
  input: VerificationInput,
  onProgress?: (stage: string, source: string) => void
): Promise<VerificationResult> {
  const sources: SourceResult[] = [];
  let productName: string | undefined;
  let manufacturer: string | undefined;
  let category: ProductCategory | undefined;

  // Step 1: Validate NAFDAC format
  let nafdacFormatValid = false;
  let nafdacPrefixCategory: string | undefined;
  
  if (input.nafdacNumber) {
    const validation = validateNafdacFormat(input.nafdacNumber);
    nafdacFormatValid = validation.valid;
    nafdacPrefixCategory = validation.categoryLabel;
    
    sources.push({
      id: 'nafdac_format',
      name: 'NAFDAC Format',
      status: validation.valid ? 'found' : 'not_found',
      confidence: validation.valid ? 70 : 0,
      details: validation.valid 
        ? `Valid NAFDAC format. Category: ${validation.categoryLabel}`
        : 'Invalid NAFDAC number format. Should be like: A4-0123 or 04-1234',
      icon: '🔢'
    });
  }

  // Step 2: Check NAFDAC Greenbook
  if (input.nafdacNumber) {
    onProgress?.('verifying', 'NAFDAC Registry');
    const nafdacResult = await verifyNafdacGreenbook(input.nafdacNumber);
    sources.push(nafdacResult);
    
    if (nafdacResult.status === 'found') {
      productName = productName || nafdacResult.productName;
      manufacturer = manufacturer || nafdacResult.manufacturer;
      if (nafdacResult.category) category = nafdacResult.category as ProductCategory;
    }
  }

  // Step 2.5: Check EMDEX (for pharmaceuticals)
  if (input.nafdacNumber && nafdacPrefixCategory?.toLowerCase().includes('pharma')) {
    onProgress?.('verifying', 'EMDEX Pharma Database');
    const emdexResult = await verifyEMDEXSource(input.nafdacNumber);
    sources.push(emdexResult);
    
    if (emdexResult.status === 'found') {
      productName = productName || emdexResult.productName;
      manufacturer = manufacturer || emdexResult.manufacturer;
      category = 'pharmaceutical';
    }
  }

  // Step 2.6: Check Apify NAFDAC Scraper (for packaged foods, water, cosmetics)
  if (input.nafdacNumber && !nafdacPrefixCategory?.toLowerCase().includes('pharma')) {
    onProgress?.('verifying', 'NAFDAC Registry (Apify)');
    const apifyResult = await verifyApifyNAFDACSource(input.nafdacNumber);
    sources.push(apifyResult);
    
    if (apifyResult.status === 'found') {
      productName = productName || apifyResult.productName;
      manufacturer = manufacturer || apifyResult.manufacturer;
      if (apifyResult.category) category = apifyResult.category as ProductCategory;
    }
  }

  // Step 3: Check Open Food Facts (via barcode proxy)
  if (input.barcode) {
    onProgress?.('verifying', 'Open Food Facts');
    const offResult = await lookupByBarcode(input.barcode);
    
    sources.push({
      id: 'open_food_facts',
      name: 'Open Food Facts',
      status: offResult.found ? 'found' : 'not_found',
      confidence: offResult.confidence,
      productName: offResult.product?.product_name,
      manufacturer: offResult.product?.brands,
      category: offResult.product?.categories?.includes('beverage') ? 'beverage' : 
                offResult.product?.categories?.includes('water') ? 'water' : 'food',
      details: offResult.found 
        ? `Found: ${offResult.product?.product_name} by ${offResult.product?.brands || 'Unknown'}`
        : offResult.error || 'Product not in Open Food Facts database',
      icon: '🥫'
    });

    if (offResult.found && offResult.product) {
      productName = productName || offResult.product.product_name;
      manufacturer = manufacturer || offResult.product.brands;
    }
  }

  // Step 3.5: Check Open Beauty Facts (for cosmetics)
  if (input.barcode) {
    onProgress?.('verifying', 'Open Beauty Facts');
    const obfResult = await lookupBeautyByBarcode(input.barcode);
    
    sources.push({
      id: 'open_beauty_facts',
      name: 'Open Beauty Facts',
      status: obfResult.found ? 'found' : 'not_found',
      confidence: obfResult.confidence,
      productName: obfResult.product?.product_name,
      manufacturer: obfResult.product?.brands,
      category: 'cosmetics',
      details: obfResult.found 
        ? `Found: ${obfResult.product?.product_name} by ${obfResult.product?.brands || 'Unknown'}`
        : obfResult.error || 'Product not in Open Beauty Facts database',
      icon: '💄'
    });

    if (obfResult.found && obfResult.product) {
      productName = productName || obfResult.product.product_name;
      manufacturer = manufacturer || obfResult.product.brands;
      category = 'cosmetics';
    }
  }

  // Step 3.6: Check UPC Database (free barcode lookup)
  if (input.barcode) {
    onProgress?.('verifying', 'UPC Database');
    const upcResult = await lookupBuycottByBarcode(input.barcode);
    
    sources.push({
      id: 'upc_database',
      name: 'UPC Database',
      status: upcResult.found ? 'found' : 'not_found',
      confidence: upcResult.confidence,
      productName: upcResult.product?.name,
      manufacturer: upcResult.product?.brand,
      category: upcResult.product?.categories?.[0] || 'other',
      details: upcResult.found 
        ? `Found: ${upcResult.product?.name} by ${upcResult.product?.brand || 'Unknown'}`
        : upcResult.error || 'Product not in UPC Database',
      icon: '📊'
    });

    if (upcResult.found && upcResult.product) {
      productName = productName || upcResult.product.name;
      manufacturer = manufacturer || upcResult.product.brand;
    }
  }

  // Step 4: Check Go-UPC barcode database
  if (input.barcode) {
    onProgress?.('verifying', 'Barcode Database');
    const goUpcResult = await verifyBarcodeGoUpc(input.barcode);
    sources.push(goUpcResult);
    
    if (goUpcResult.status === 'found') {
      productName = productName || goUpcResult.productName;
      manufacturer = manufacturer || goUpcResult.manufacturer;
    }
  }

  // Step 5: Fallback to mock database (DISABLED)
  if (!productName && (input.nafdacNumber || input.barcode)) {
    const mock = lookupMockDatabase(input.nafdacNumber, input.barcode);
    if (mock) {
      productName = mock.productName;
      manufacturer = mock.manufacturer;
      category = mock.category;
      
      sources.push({
        id: 'mock_fallback',
        name: 'Local Database',
        status: 'found',
        confidence: 60,
        productName: mock.productName,
        manufacturer: mock.manufacturer,
        details: 'Found in local reference database',
        icon: '💾'
      });
    }
  }

  // Step 6: Calculate overall result
  const sourcesChecked = sources.filter(s => s.status !== 'skipped').length;
  const sourcesFound = sources.filter(s => s.status === 'found').length;
  
  const productNames = sources
    .filter(s => s.status === 'found' && s.productName)
    .map(s => s.productName?.toLowerCase().trim());
  const crossReferenceMatch = productNames.length >= 2 && 
    productNames.every(name => name === productNames[0]);

  let overallStatus: VerificationStatus;
  let overallConfidence: number;

  if (sourcesFound === 0 && sourcesChecked > 0) {
    if (nafdacFormatValid) {
      overallStatus = 'warning';
      overallConfidence = 40;
    } else {
      overallStatus = 'counterfeit';
      overallConfidence = 70;
    }
  } else if (sourcesFound === 1) {
    overallStatus = 'warning';
    overallConfidence = 55;
  } else if (sourcesFound >= 2) {
    if (crossReferenceMatch) {
      overallStatus = 'safe';
      overallConfidence = 90;
    } else {
      overallStatus = 'safe';
      overallConfidence = 75;
    }
  } else {
    overallStatus = 'pending';
    overallConfidence = 30;
  }

  if (nafdacFormatValid && sources.some(s => s.id === 'nafdac_greenbook' && s.status === 'found')) {
    overallStatus = 'safe';
    overallConfidence = Math.max(overallConfidence, 85);
  }

  const recommendations = generateRecommendations(overallStatus, sources, nafdacFormatValid);

  return {
    overallStatus,
    overallConfidence,
    productName,
    manufacturer,
    category,
    nafdacNumber: input.nafdacNumber,
    barcode: input.barcode,
    sources,
    timestamp: new Date(),
    recommendations,
    details: {
      nafdacFormatValid,
      nafdacPrefixCategory,
      sourcesChecked,
      sourcesFound,
      crossReferenceMatch
    }
  };
}

function generateRecommendations(
  status: VerificationStatus,
  sources: SourceResult[],
  nafdacFormatValid: boolean
): string[] {
  const recommendations: string[] = [];

  if (status === 'safe') {
    recommendations.push('✅ This product has been verified across multiple sources.');
    recommendations.push('The product details match across databases, indicating authenticity.');
    recommendations.push('Always purchase from authorized dealers and reputable stores.');
  } else if (status === 'warning') {
    recommendations.push('⚠️ Limited verification data available for this product.');
    recommendations.push('This does NOT necessarily mean the product is fake.');
    recommendations.push('Many legitimate Nigerian products are not yet in global databases.');
    
    if (!nafdacFormatValid) {
      recommendations.push('The NAFDAC number format appears incorrect. Double-check the number on the packaging.');
    }
    
    recommendations.push('For additional verification, visit: registration.nafdac.gov.ng');
    recommendations.push('Contact NAFDAC: 0800-NAFDAC-1 (0800-6233-221)');
  } else if (status === 'counterfeit') {
    recommendations.push('🚨 HIGH RISK: This product shows strong signs of being counterfeit.');
    recommendations.push('DO NOT USE or consume this product.');
    recommendations.push('Report immediately to NAFDAC: 0800-NAFDAC-1 (0800-6233-221)');
    recommendations.push('Report online: postreg.nafdac.gov.ng');
    recommendations.push('If already consumed and feeling unwell, seek medical attention immediately.');
  } else {
    recommendations.push('Unable to fully verify this product with current data.');
    recommendations.push('Try scanning the barcode instead of entering the NAFDAC number.');
    recommendations.push('Visit registration.nafdac.gov.ng for official verification.');
  }

  return recommendations;
}
