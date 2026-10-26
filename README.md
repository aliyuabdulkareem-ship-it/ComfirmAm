# ConfirmAm - Multi-Source Product Verification

A lightweight, mobile-first web app for detecting counterfeit products in the Nigerian market. Uses multiple verification sources including NAFDAC Greenbook, Open Food Facts, and global barcode databases.

## 🎯 Features

- **Multi-Source Verification**: Cross-references NAFDAC registry, Open Food Facts, and barcode databases
- **Three Input Methods**: Camera scan, NAFDAC number entry, Barcode entry
- **Real API Integration**:
  - ✅ Open Food Facts API (free, no key needed)
  - ✅ NAFDAC Greenbook (via serverless proxy)
  - ✅ Go-UPC Barcode Database (via serverless proxy)
- **Color-Coded Results**: Green (Safe), Amber (Warning), Red (Counterfeit)
- **Source Attribution**: Shows which databases confirmed the product
- **Desktop & Mobile Optimized**: Responsive design works on all devices
- **Camera Bug Fixed**: Video stream starts reliably on all browsers

## 📁 Project Structure

```
confirmam/
├── package.json
├── vite.config.js
├── vercel.json
├── index.html
├── README.md
├── api/                          ← Vercel Serverless Functions
│   ├── verify-nafdac.js          ← NAFDAC Greenbook proxy
│   └── verify-barcode.js         ← Go-UPC barcode proxy
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                   ← Main app (all components)
    └── services/
        ├── openFoodFacts.ts      ← Open Food Facts API client
        └── verificationEngine.ts ← Multi-source orchestrator
```

## 🚀 Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "ConfirmAm v2.0 - Multi-source verification"
git push
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Framework Preset**: Select `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Click **Deploy**

### Step 3: (Optional) Add Go-UPC API Key
For enhanced barcode verification:
1. Get a free API key from https://go-upc.com/api (1,000 requests/month free)
2. In Vercel dashboard → Settings → Environment Variables
3. Add: `GO_UPC_API_KEY` = your_key_here
4. Redeploy

**Note**: The app works WITHOUT the Go-UPC key. It falls back to Open Food Facts for barcode lookups.

## 🔌 API Sources

### 1. Open Food Facts (Always Active)
- **URL**: https://world.openfoodfacts.org/
- **API**: Free, no key needed
- **Coverage**: 4M+ food products globally
- **CORS**: Enabled (works from browser)

### 2. NAFDAC Greenbook (Serverless Proxy)
- **URL**: https://greenbook.nafdac.gov.ng/
- **Endpoint**: `/api/verify-nafdac?number=XX-XXXX`
- **Coverage**: 8,949+ registered products
- **Fallback**: Local cached database

### 3. Go-UPC (Serverless Proxy)
- **URL**: https://go-upc.com/
- **Endpoint**: `/api/verify-barcode?code=XXXXXXXX`
- **Coverage**: Global barcode database
- **Free Tier**: 1,000 requests/month

## 🧪 Test Numbers

### NAFDAC Numbers
- `A4-0123` or `04-0123` → Paracetamol (Emzor)
- `01-2345` → Peak Milk
- `08-7712` → Dettol
- `A2-0789` → Eva Table Water
- `03-9988` → Indomie

### Barcodes
- `6156000100158` → Indomie / Peak Milk
- `5449000000996` → Coca-Cola
- `7613034262288` → Milo

## 📞 NAFDAC Reporting
- Hotline: 0800-NAFDAC-1 (0800-6233-221)
- Website: https://registration.nafdac.gov.ng/
- Greenbook: https://greenbook.nafdac.gov.ng/

## 🔧 Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
```

## 🎨 UI/UX Features

- **Mobile-First Design**: Optimized for touch interactions
- **Desktop Responsive**: Works beautifully on larger screens
- **Smooth Animations**: Polished transitions and loading states
- **Accessibility**: WCAG compliant focus states and ARIA labels
- **Safe Areas**: Handles notched devices (iPhone X+)
- **Camera Fix**: Video element always in DOM for reliable startup

## 📝 Future Enhancements
- [ ] Tesseract.js for offline OCR
- [ ] Google Gemini Flash for Vision AI
- [ ] GS1 Nigeria integration
- [ ] User accounts & verification history
- [ ] Push notifications for recalls
- [ ] Offline mode with IndexedDB caching

---

**Built with ❤️ for Nigerian consumers**
