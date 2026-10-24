import { Link } from 'react-router-dom';
export function Gone({ message }: { message?: string }) {
  return (
    <main className="wrap" id="app-main" style={{ paddingTop: 64, paddingBottom: 96, maxWidth: 640 }}>
      <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1 }}>That session is gone</h1>
      <p style={{ marginTop: 16 }}>{message || 'It expired after 30 days or was deleted. Nothing is kept once it is deleted.'}</p>
      <p style={{ marginTop: 24 }}><Link className="btn" to="/app">Start a new one</Link></p>
    </main>
  );
}
