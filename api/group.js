export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, system } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const portkeyApiKey = process.env.PORTKEY_SHARED_SERVICE_KEY;
  if (!portkeyApiKey) return res.status(500).json({ error: 'Missing PORTKEY_SHARED_SERVICE_KEY' });

  try {
    const modelName = process.env.PORTKEY_ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    const providerSlug = process.env.PORTKEY_ANTHROPIC_PROVIDER || '@anthropic';
    const model = modelName.startsWith('@') ? modelName : `${providerSlug}/${modelName}`;

    const content = Array.isArray(prompt) ? prompt : prompt;

    const isVision = Array.isArray(prompt);

    const messages = [{ role: 'user', content }];

    // For non-vision JSON calls, prefill the assistant response with '{' or '['
    // This forces the model to continue with JSON instead of responding conversationally
    if (!isVision) {
      messages.push({ role: 'assistant', content: system?.includes('array') ? '[' : '{' });
    }

    const body = {
      model,
      max_tokens: 8000,
      messages,
    };
    if (system) body.system = system;

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
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    // If we prefilled, prepend the prefill character back to the response text
    if (!isVision && data.content?.[0]?.text) {
      const prefill = system?.includes('array') ? '[' : '{';
      data.content[0].text = prefill + data.content[0].text;
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
