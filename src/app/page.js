import { fetchCoc } from '@/lib/cocApi';
import Image from 'next/image';

export default async function Home() {
  const clanTag = '%232CL8J9L2G';
  let clan = null;
  let error = null;

  try {
    clan = await fetchCoc(`/clans/${clanTag}`);
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div className="glass-panel text-center">
        <h2 className="text-elixir" style={{ marginBottom: '1rem' }}>Error Loading Clan Data</h2>
        <p className="text-muted">{error}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Did you set the <code>COC_API_KEY</code> in your environment variables?</p>
      </div>
    );
  }

  if (!clan) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header Section */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '1rem' }}>
          {clan.badgeUrls && (
            <Image 
              src={clan.badgeUrls.large || clan.badgeUrls.medium} 
              alt={`${clan.name} Badge`} 
              fill 
              style={{ objectFit: 'contain' }}
              priority
            />
          )}
        </div>
        <h1 className="title-glow" style={{ fontSize: '3rem', margin: '0.5rem 0' }}>{clan.name}</h1>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="text-gold" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Level {clan.clanLevel}</span>
          <span className="text-muted">•</span>
          <span className="text-elixir" style={{ fontWeight: '600' }}>{clan.members}/50 Members</span>
          <span className="text-muted">•</span>
          <span className="text-dark-elixir" style={{ fontWeight: '600' }}>{clan.clanPoints} Trophies</span>
        </div>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px', lineHeight: '1.6' }} className="text-secondary">
          {clan.description}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel text-center">
          <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>War Wins</h3>
          <p className="text-gold" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{clan.warWins}</p>
        </div>
        <div className="glass-panel text-center">
          <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Win Streak</h3>
          <p className="text-elixir" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{clan.warWinStreak}</p>
        </div>
        <div className="glass-panel text-center">
          <h3 className="text-muted" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Capital League</h3>
          <p className="text-dark-elixir" style={{ fontSize: '1.5rem', fontWeight: 800, margin: '1rem 0' }}>
            {clan.capitalLeague ? clan.capitalLeague.name : 'Unranked'}
          </p>
        </div>
      </div>
      
      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1rem' }}>
        <div className="glass-panel">
          <h3 className="text-gold" style={{ marginBottom: '1rem' }}>Requirements</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--border-glass)' }}>
              <span className="text-muted">Type</span>
              <span>{clan.type === 'inviteOnly' ? 'Invite Only' : clan.type}</span>
            </li>
            <li className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--border-glass)' }}>
              <span className="text-muted">Required Trophies</span>
              <span>{clan.requiredTrophies}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Required Town Hall</span>
              <span>{clan.requiredTownhallLevel}</span>
            </li>
          </ul>
        </div>
        <div className="glass-panel">
          <h3 className="text-elixir" style={{ marginBottom: '1rem' }}>Location & Frequency</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--border-glass)' }}>
              <span className="text-muted">Location</span>
              <span>{clan.location?.name || 'International'}</span>
            </li>
            <li className="flex justify-between border-b" style={{ paddingBottom: '0.5rem', borderColor: 'var(--border-glass)' }}>
              <span className="text-muted">War Frequency</span>
              <span style={{ textTransform: 'capitalize' }}>{clan.warFrequency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">War League</span>
              <span>{clan.warLeague?.name || 'Unranked'}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
