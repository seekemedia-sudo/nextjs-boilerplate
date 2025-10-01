'use client';

import { useState } from 'react';

export default function Page() {
  const [url, setUrl] = useState('https://www.autonationtoyotafortmyers.com');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealershipUrl: url })
      });
      if (!res.ok) throw new Error(`Build failed: ${res.status}`);
      const blob = await res.blob();
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Dealer Search CSV Builder</h1>
      <form onSubmit={handleBuild} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://dealer-site.com"
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button disabled={busy} style={{ padding: '10px 16px', borderRadius: 6 }}>
          {busy ? 'Building…' : 'Build CSV ZIP'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
      {downloadUrl && (
        <p style={{ marginTop: 12 }}>
          <a href={downloadUrl} download="google-ads-search.zip">Download CSV ZIP</a>
        </p>
      )}
    </main>
  );
}
