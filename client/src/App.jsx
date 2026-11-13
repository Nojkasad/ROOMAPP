import { useEffect, useState } from 'react';

// Stage 1 shell: shows that the client loads, Tailwind works,
// and the /api proxy reaches the Express server.
export default function App() {
  const [api, setApi] = useState('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setApi(data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setApi('error'));
  }, []);

  const badge = {
    checking: 'bg-gray-200 text-gray-700',
    ok: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }[api];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-4">
      <h1 className="text-4xl font-bold text-slate-900">ROOMAPP</h1>
      <p className="text-slate-600">Namų ruošos darbų sekimas su QR kodais</p>
      <span className={`rounded-full px-4 py-1 text-sm font-medium ${badge}`}>API: {api}</span>
    </main>
  );
}
