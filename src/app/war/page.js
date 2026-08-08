import { fetchCoc } from '@/lib/cocApi';
import Image from 'next/image';

function ClanWarCard({ clan, opponent, type }) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <h3 className="text-muted" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{type}</h3>
      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '1rem' }}>
        {clan.badgeUrls && (
          <Image 
            src={clan.badgeUrls.large || clan.badgeUrls.medium} 
            alt={`${clan.name} Badge`} 
            fill 
            style={{ objectFit: 'contain' }}
          />
        )}
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{clan.name}</h2>
      <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Lvl {clan.clanLevel}</p>
      
      <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center', width: '100%', justifyContent: 'center' }}>
        <div>
          <span className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>{clan.stars}</span>
          <span className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Stars</span>
        </div>
        <div>
          <span className="text-elixir" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>{clan.attacks}</span>
          <span className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Attacks</span>
        </div>
        <div>
          <span className="text-dark-elixir" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>{clan.destructionPercentage.toFixed(1)}%</span>
          <span className="text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Destruction</span>
        </div>
      </div>
    </div>
  );
}

export default async function WarPage() {
  const clanTag = '%232CL8J9L2G';
  let currentWar = null;
  let warLog = null;
  let error = null;

  try {
    currentWar = await fetchCoc(`/clans/${clanTag}/currentwar`);
    const warLogData = await fetchCoc(`/clans/${clanTag}/warlog`);
    warLog = warLogData.items;
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div className="glass-panel text-center">
        <h2 className="text-elixir">Error Loading War Data</h2>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="title-glow" style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>War Status</h1>
      
      {/* Current War Section */}
      <h2 className="text-elixir" style={{ marginBottom: '1rem' }}>Current War</h2>
      {currentWar && currentWar.state !== 'notInWar' ? (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <span className="glass-panel" style={{ padding: '0.5rem 1.5rem', borderRadius: '30px', fontWeight: 'bold', color: 'var(--coc-gold)' }}>
              State: <span style={{ textTransform: 'capitalize' }}>{currentWar.state}</span> • Size: {currentWar.teamSize}v{currentWar.teamSize}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <ClanWarCard clan={currentWar.clan} type="Our Clan" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <span className="title-glow" style={{ fontSize: '3rem', fontWeight: 900 }}>VS</span>
            </div>
            <ClanWarCard clan={currentWar.opponent} type="Opponent" />
          </div>
        </div>
      ) : (
        <div className="glass-panel text-center" style={{ marginBottom: '3rem' }}>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>The clan is currently not in a war.</p>
        </div>
      )}

      {/* War Log Section */}
      <h2 className="text-gold" style={{ marginBottom: '1rem' }}>Recent War Log</h2>
      {warLog && warLog.length > 0 ? (
        <div className="glass-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {warLog.slice(0, 10).map((war, index) => {
              const isWin = war.result === 'win';
              const isTie = war.result === 'tie';
              const resultColor = isWin ? '#00FFCC' : isTie ? '#FFC107' : '#FF4444';
              
              return (
                <div key={index} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  borderLeft: `4px solid ${resultColor}` 
                }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: resultColor, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>{war.result}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>{war.teamSize}v{war.teamSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 600 }}>VS</span>
                    <span className="text-primary">{war.opponent.name}</span>
                  </div>
                  <div className="flex gap-4" style={{ marginTop: '0.8rem' }}>
                    <div>
                      <span className="text-gold" style={{ fontWeight: 'bold' }}>{war.clan.stars}</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Stars</span>
                    </div>
                    <div>
                      <span className="text-dark-elixir" style={{ fontWeight: 'bold' }}>{war.clan.destructionPercentage.toFixed(1)}%</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Dest.</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-muted">No war log data available.</p>
      )}
    </div>
  );
}
