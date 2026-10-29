/**
 * Apify NAFDAC Scraper Service
 * Scrapes NAFDAC Greenbook for packaged foods, water, cosmetics, etc.
 * API: https://apify.com/a-g-d/ng-nafdac/api
 */

export interface NAFDACProduct {
  nrn: string; // NAFDAC Registration Number
  productName: string;
  manufacturer: string;
  category: string;
  status: string;
  approvalDate?: string;
  expiryDate?: string;
  packSize?: string;
}

export interface ApifySearchResult {
  found: boolean;
  product?: NAFDACProduct;
  confidence: number;
  source: string;
  error?: string;
}

// Apify API configuration
// Note: You'll need to get an API token from https://apify.com/
const APIFY_API_BASE = 'https://api.apify.com/v2';
const APIFY_ACTOR_ID = 'a-g-d/ng-nafdac';
const APIFY_TOKEN = (import.meta as any).env?.VITE_APIFY_TOKEN || '';

/**
 * Search NAFDAC registry via Apify scraper
 */
export async function searchNAFDACRegistry(query: string): Promise<ApifySearchResult> {
  if (!APIFY_TOKEN) {
    return {
      found: false,
      confidence: 0,
      source: 'Apify NAFDAC',
      error: 'Apify API token not configured'
    };
  }

  try {
    // Start the Apify actor run
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: query,
          maxResults: 1
        }),
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!runResponse.ok) {
      return {
        found: false,
        confidence: 0,
        source: 'Apify NAFDAC',
        error: `Apify API returned status ${runResponse.status}`
      };
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      return {
        found: false,
        confidence: 0,
        source: 'Apify NAFDAC',
        error: 'Failed to start Apify actor'
      };
    }

    // Wait for the run to complete (poll every 2 seconds, max 30 seconds)
    let attempts = 0;
    const maxAttempts = 15;
    let datasetId: string | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `${APIFY_API_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      
      const statusData = await statusResponse.json();
      
      if (statusData.data?.status === 'SUCCEEDED') {
        datasetId = statusData.data?.defaultDatasetId;
        break;
      } else if (statusData.data?.status === 'FAILED' || statusData.data?.status === 'ABORTED') {
        return {
          found: false,
          confidence: 0,
          source: 'Apify NAFDAC',
          error: 'Apify actor failed or was aborted'
        };
      }
      
      attempts++;
    }

    if (!datasetId) {
      return {
        found: false,
        confidence: 0,
        source: 'Apify NAFDAC',
        error: 'Timeout waiting for Apify actor to complete'
      };
    }

    // Fetch the dataset items
    const datasetResponse = await fetch(
      `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    if (!datasetResponse.ok) {
      return {
        found: false,
        confidence: 0,
        source: 'Apify NAFDAC',
        error: 'Failed to fetch dataset items'
      };
    }

    const items = await datasetResponse.json();

    if (items && items.length > 0) {
      const item = items[0];
      return {
        found: true,
        product: {
          nrn: item.nrn || item.nafdac_number || '',
          productName: item.product_name || item.productName || '',
          manufacturer: item.manufacturer || item.applicant || '',
          category: item.category || item.product_category || '',
          status: item.status || 'Active',
          approvalDate: item.approval_date || item.approvalDate,
          expiryDate: item.expiry_date || item.expiryDate,
          packSize: item.pack_size || item.packSize
        },
        confidence: 90,
        source: 'Apify NAFDAC'
      };
    }

    return {
      found: false,
      confidence: 0,
      source: 'Apify NAFDAC',
      error: 'Product not found in NAFDAC registry'
    };
  } catch (error) {
    console.error('Apify NAFDAC Error:', error);
    return {
      found: false,
      confidence: 0,
      source: 'Apify NAFDAC',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Search by NAFDAC Registration Number (NRN)
 */
export async function searchByNRN(nrn: string): Promise<ApifySearchResult> {
  return searchNAFDACRegistry(nrn);
}

/**
 * Search by product name
 */
export async function searchByProductName(productName: string): Promise<ApifySearchResult> {
  return searchNAFDACRegistry(productName);
}
