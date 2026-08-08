import { fetchCoc } from '@/lib/cocApi';
import CardsDashboard from '@/components/CardsDashboard';

export default async function CardsPage() {
  const clanTag = '%232CL8J9L2G';
  let members = [];
  let error = null;

  try {
    const data = await fetchCoc(`/clans/${clanTag}/members`);
    members = data.items;
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div className="glass-panel text-center">
        <h2 className="text-elixir">Error Loading Clan Members</h2>
        <p className="text-muted">{error}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>The Card Trading platform requires clan members to be loaded.</p>
      </div>
    );
  }

  return <CardsDashboard clanMembers={members} />;
}
