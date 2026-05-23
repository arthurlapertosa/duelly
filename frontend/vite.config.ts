import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_ALLOWED_HOSTS = ['duelly-hml.typewith.ai'];

function normalizeAllowedHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('.')) return trimmed;
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

function readAllowedHosts(raw: string | undefined): string[] {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);
  for (const value of (raw ?? '').split(',')) {
    const host = normalizeAllowedHost(value);
    if (host) hosts.add(host);
  }
  return [...hosts];
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = readAllowedHosts(env.VITE_ALLOWED_HOSTS);
  if (command === 'build' && env.VITE_QA_WALLET === 'true') {
    throw new Error('VITE_QA_WALLET cannot be enabled for production frontend builds');
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      allowedHosts,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      allowedHosts,
    },
  };
});
