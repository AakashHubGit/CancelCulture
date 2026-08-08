import { fetchCoc } from '@/lib/cocApi';
import Link from 'next/link';

export default async function PlayerProfile({ params }) {
  const decodedTag = decodeURIComponent(params.tag);
  // Re-encode to ensure the '#' is converted to '%23' for the API request
  const playerTag = encodeURIComponent(decodedTag.startsWith('#') ? decodedTag : `#${decodedTag}`);
  
  let player = null;
  let error = null;

  try {
    player = await fetchCoc(`/players/${playerTag}`);
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div className="glass-panel text-center">
        <h2 className="text-elixir">Error Loading Player</h2>
        <p className="text-muted">{error}</p>
        <Link href="/members" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Back to Members</Link>
      </div>
    );
  }

  if (!player) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/members" className="text-muted" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          &larr; Back to Members
        </Link>
        <div className="glass-panel text-center">
          <h1 className="title-glow" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{player.name}</h1>
          <p className="text-muted" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{player.tag}</p>
          
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
              <span className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Town Hall</span>
              <p className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{player.townHallLevel}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Trophies</span>
              <p className="text-dark-elixir" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{player.trophies}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Exp Level</span>
              <p className="text-elixir" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{player.expLevel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Heroes Section */}
        <div className="glass-panel">
          <h2 className="text-elixir" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Heroes</h2>
          {player.heroes && player.heroes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {player.heroes.filter(h => h.village === 'home').map(hero => (
                <div key={hero.name} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{hero.name}</p>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className="text-gold" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Lvl {hero.level}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>Max: {hero.maxLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No heroes found.</p>
          )}
        </div>

        {/* Spells Section */}
        <div className="glass-panel">
          <h2 className="text-dark-elixir" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Spells</h2>
          {player.spells && player.spells.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {player.spells.filter(s => s.village === 'home').map(spell => (
                <div key={spell.name} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{spell.name}</p>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className="text-elixir" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Lvl {spell.level}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>Max: {spell.maxLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No spells found.</p>
          )}
        </div>
      </div>
      
      {/* Troops Section */}
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <h2 className="text-gold" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Troops (Home Village)</h2>
        {player.troops && player.troops.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
            {player.troops.filter(t => t.village === 'home').map(troop => (
              <div key={troop.name} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={troop.name}>{troop.name}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="text-primary" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Lvl {troop.level}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No troops found.</p>
        )}
      </div>
    </div>
  );
}
