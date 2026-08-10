import { fetchCoc } from '@/lib/cocApi';
import Link from 'next/link';

export default async function MembersPage() {
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
        <h2 className="text-elixir">Error Loading Members</h2>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (!members.length) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="title-glow" style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>Clan Members</h1>
      
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Role</th>
              <th style={{ padding: '1rem' }}>Trophies</th>
              <th style={{ padding: '1rem', color: 'var(--coc-gold)' }}>Donated</th>
              <th style={{ padding: '1rem', color: 'var(--coc-elixir)' }}>Received</th>
            </tr>
          </thead>
          <tbody className="animate-stagger">
            {members.map((member) => (
              <tr key={member.tag} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'var(--transition)' }} className="member-row">
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{member.clanRank}</td>
                <td style={{ padding: '1rem' }}>
                  <Link href={`/members/${encodeURIComponent(member.tag)}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <span className="text-primary hover:text-gold" style={{ transition: 'color 0.2s' }}>{member.name}</span>
                  </Link>
                </td>
                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                  {member.role === 'admin' ? 'Elder' : member.role === 'coLeader' ? 'Co-Leader' : member.role}
                </td>
                <td style={{ padding: '1rem', color: 'var(--coc-dark-elixir)', fontWeight: 'bold' }}>
                  {member.trophies}
                </td>
                <td style={{ padding: '1rem', color: 'var(--coc-gold)' }}>{member.donations}</td>
                <td style={{ padding: '1rem', color: 'var(--coc-elixir)' }}>{member.donationsReceived}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .member-row:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .hover\\:text-gold:hover {
          color: var(--coc-gold) !important;
        }
      `}} />
    </div>
  );
}
