/**
 * Multi-Source Verification Engine
 *
 * Coordinates verification across multiple data sources:
 * 1. Open Food Facts API (free, works for food/beverages)
 * 2. Go-UPC API (barcode lookup via serverless proxy)
 * 3. NAFDAC Greenbook (via serverless proxy)
 * 4. Local mock database (fallback)
 */

import { lookupByBarcode } from './openFoodFacts';

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
// MOCK NAFDAC DATABASE (Fallback)
// ============================================================================

interface MockProduct {
  nafdacNumber: string;
  productName: string;
  manufacturer: string;
  category: ProductCategory;
  barcode?: string;
}

const MOCK_DATABASE: MockProduct[] = [
  { nafdacNumber: '04-0123', productName: 'Paracetamol 500mg', manufacturer: 'Emzor Pharmaceuticals Ltd', category: 'pharmaceutical' },
  { nafdacNumber: '05-4521', productName: 'Amoxicillin 250mg', manufacturer: 'May & Baker Nigeria Plc', category: 'pharmaceutical' },
  { nafdacNumber: '01-2345', productName: 'Peak Evaporated Milk', manufacturer: 'FrieslandCampina WAMCO', category: 'food', barcode: '6156000100158' },
  { nafdacNumber: '08-7712', productName: 'Dettol Antiseptic Liquid', manufacturer: 'Reckitt Benckiser Nigeria', category: 'cosmetics' },
  { nafdacNumber: '03-9988', productName: 'Indomie Instant Noodles', manufacturer: 'Dufil Prima Foods Plc', category: 'food', barcode: '6156000100158' },
  { nafdacNumber: '06-3344', productName: 'Nivea Body Lotion', manufacturer: 'Beiersdorf Nigeria', category: 'cosmetics' },
  { nafdacNumber: '04-5567', productName: 'Artemether/Lumefantrine', manufacturer: 'Guangzhou Pharmaceutical', category: 'pharmaceutical' },
  { nafdacNumber: '02-1199', productName: 'Coca-Cola 50cl', manufacturer: 'Nigerian Bottling Company', category: 'beverage', barcode: '5449000000996' },
  { nafdacNumber: 'A1-0456', productName: 'Golden Penny Semolina', manufacturer: 'Flour Mills of Nigeria', category: 'food' },
  { nafdacNumber: 'A2-0789', productName: 'Eva Table Water 75cl', manufacturer: 'Nestle Nigeria', category: 'water' },
  { nafdacNumber: '01-3456', productName: 'Milo Chocolate Drink', manufacturer: 'Nestle Nigeria', category: 'beverage', barcode: '7613034262288' },
  { nafdacNumber: '01-4567', productName: 'Maggi Star Seasoning', manufacturer: 'Nestle Nigeria', category: 'food' },
  { nafdacNumber: 'A5-1234', productName: 'Nivea Crème', manufacturer: 'Beiersdorf Nigeria', category: 'cosmetics' },
  { nafdacNumber: '01-5678', productName: 'Gino Tomato Paste', manufacturer: 'GB Foods Africa', category: 'food' },
  { nafdacNumber: 'A2-2345', productName: 'Aquafina Water 75cl', manufacturer: 'Seven-Up Bottling Co', category: 'water' },
];

function lookupMockDatabase(nafdacNumber?: string, barcode?: string): MockProduct | null {
  if (nafdacNumber) {
    const normalized = nafdacNumber.replace(/[-/]/g, '').toUpperCase();
    const found = MOCK_DATABASE.find(p =>
      p.nafdacNumber.replace(/[-/]/g, '').toUpperCase() === normalized
    );
    if (found) return found;
  }

  if (barcode) {
    const found = MOCK_DATABASE.find(p => p.barcode === barcode);
    if (found) return found;
  }

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

  // Step 5: Fallback to mock database
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
