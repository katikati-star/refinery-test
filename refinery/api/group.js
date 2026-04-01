export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, system } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const portkeyApiKey = process.env.PORTKEY_SHARED_SERVICE_KEY;
  if (!portkeyApiKey) {
    return res.status(500).json({ error: 'Missing PORTKEY_SHARED_SERVICE_KEY' });
  }

  try {
    const modelName = process.env.PORTKEY_ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    const providerSlug = process.env.PORTKEY_ANTHROPIC_PROVIDER || '@anthropic';
    const model = modelName.startsWith('@') ? modelName : `${providerSlug}/${modelName}`;
    const body = {
      model,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch('https://api.portkey.ai/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portkey-api-key': portkeyApiKey,
        'x-portkey-provider': 'anthropic',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
