/**
 * Vercel Serverless Function: Barcode Verification
 *
 * ENDPOINT: GET /api/verify-barcode?code=XXXXXXXXXXXXX
 *
 * Proxies requests to Go-UPC API (if key set) or falls back to Open Food Facts.
 */

const GO_UPC_API_URL = 'https://go-upc.com/api/v1/barcode';
const GO_UPC_API_KEY = process.env.GO_UPC_API_KEY || '';
const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const barcode = (req.query.code || '').trim();

  if (!barcode) {
    return res.status(400).json({ found: false, error: 'Barcode is required' });
  }

  const cleanBarcode = barcode.replace(/[\s-]/g, '');

  if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
    return res.status(400).json({
      found: false,
      error: 'Invalid barcode format. Expected 8-14 digits.'
    });
  }

  // Try Go-UPC first (if API key is configured)
  if (GO_UPC_API_KEY) {
    try {
      const response = await fetch(`${GO_UPC_API_URL}/${cleanBarcode}`, {
        headers: {
          'Authorization': `Bearer ${GO_UPC_API_KEY}`,
          'User-Agent': 'ConfirmAm/2.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();

        if (data.product) {
          res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

          return res.status(200).json({
            found: true,
            barcode: cleanBarcode,
            productName: data.product.name || 'Unknown Product',
            manufacturer: data.product.manufacturer || data.product.brand || 'Unknown',
            category: data.product.category || 'Unknown',
            description: data.product.description || '',
            imageUrl: data.product.imageUrl || '',
            source: 'go_upc',
            verifiedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('[Go-UPC] Error:', error);
    }
  }

  // Fallback: Open Food Facts
  try {
    const response = await fetch(`${OFF_API_URL}/${cleanBarcode}.json`, {
      headers: {
        'User-Agent': 'ConfirmAm/2.0 (Nigerian Product Verification App)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();

      if (data.status === 1 && data.product) {
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

        return res.status(200).json({
          found: true,
          barcode: cleanBarcode,
          productName: data.product.product_name || 'Unknown Product',
          manufacturer: data.product.brands || 'Unknown',
          category: data.product.categories || 'Food',
          description: data.product.generic_name || '',
          imageUrl: data.product.image_url || '',
          countries: data.product.countries || '',
          source: 'open_food_facts',
          verifiedAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('[Open Food Facts] Error:', error);
  }

  // Not found
  return res.status(200).json({
    found: false,
    barcode: cleanBarcode,
    error: 'Barcode not found in any database',
    sources_checked: GO_UPC_API_KEY ? ['go_upc', 'open_food_facts'] : ['open_food_facts'],
    verifiedAt: new Date().toISOString(),
    suggestion: 'Not all products are in global databases. This is common for Nigerian products.'
  });
}
