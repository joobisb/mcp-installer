export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Fetch registry from GitHub
    const response = await fetch(
      'https://raw.githubusercontent.com/joobisb/mcp-installer/main/packages/registry/servers.json',
      {
        headers: {
          'User-Agent': 'mcp-installer-webapp',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate the data structure
    if (!data.servers || !Array.isArray(data.servers)) {
      throw new Error('Invalid registry format: missing or invalid servers array');
    }

    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes

    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch registry:', error);
    res.status(500).json({ 
      error: 'Failed to fetch registry',
      message: error.message 
    });
  }
}