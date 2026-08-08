import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CancelCulture | Clash of Clans',
  description: 'Clan insights and statistics for CancelCulture',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav-container">
          <div className="flex items-center gap-4">
            <h1 className="title-glow" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              CancelCulture
            </h1>
          </div>
          <ul className="nav-links">
            <li><Link href="/" className="nav-link">Home</Link></li>
            <li><Link href="/members" className="nav-link">Members</Link></li>
            <li><Link href="/war" className="nav-link">War Log</Link></li>
            <li><Link href="/cards" className="nav-link" style={{ color: 'var(--coc-dark-elixir)' }}>Card Trading</Link></li>
          </ul>
        </nav>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
