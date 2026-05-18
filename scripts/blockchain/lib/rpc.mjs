export async function ethCall({ rpcUrl, to, data, block = 'latest' }) {
  if (!rpcUrl) throw new Error('Missing rpcUrl');
  if (!/^0x[0-9a-fA-F]{40}$/.test(to || '')) throw new Error(`Invalid to address: ${to}`);
  if (!/^0x[0-9a-fA-F]*$/.test(data || '')) throw new Error('Invalid calldata');

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, block],
    }),
  });

  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

export function redactRpcUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/key|token|secret|apikey/i.test(key)) parsed.searchParams.set(key, '***');
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&](?:key|token|secret|apikey)=)[^&]+/gi, '$1***');
  }
}
