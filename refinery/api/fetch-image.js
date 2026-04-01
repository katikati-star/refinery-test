export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { asin } = req.body;
  if (!asin) return res.status(400).json({ error: 'Missing ASIN' });

  try {
    const url = `https://www.amazon.com/dp/${asin}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const html = await response.text();

    // Extract main product image URL from Amazon page
    let imageUrl = null;

    // Try landing-image (main product image)
    const landingMatch = html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
    if (landingMatch) imageUrl = landingMatch[1];

    // Fallback: try hiRes image in colorImages
    if (!imageUrl) {
      const hiResMatch = html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
      if (hiResMatch) imageUrl = hiResMatch[1];
    }

    // Fallback: try og:image meta tag
    if (!imageUrl) {
      const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogMatch) imageUrl = ogMatch[1];
    }

    if (!imageUrl) {
      return res.status(404).json({ error: 'Image not found', asin });
    }

    return res.status(200).json({ asin, imageUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message, asin });
  }
}
