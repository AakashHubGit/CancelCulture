"use client";

import { useState, useEffect } from 'react';
import cardsData from '@/data/cards.json';

export default function CardsDashboard({ clanMembers }) {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [tradesDb, setTradesDb] = useState({});
  const [myNeeds, setMyNeeds] = useState([]);
  const [myDuplicates, setMyDuplicates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'matches'
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (selectedPlayer && tradesDb[selectedPlayer]) {
      setMyNeeds(tradesDb[selectedPlayer].needs || []);
      setMyDuplicates(tradesDb[selectedPlayer].duplicates || []);
    } else {
      setMyNeeds([]);
      setMyDuplicates([]);
    }
  }, [selectedPlayer, tradesDb]);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/cards');
      if (res.ok) {
        const data = await res.json();
        setTradesDb(data);
      }
    } catch (e) {
      console.error('Failed to fetch trades', e);
    }
  };

  const handleSave = async () => {
    if (!selectedPlayer) return;
    setIsSaving(true);
    const member = clanMembers.find(m => m.tag === selectedPlayer);
    
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerTag: selectedPlayer,
          playerName: member.name,
          needs: myNeeds,
          duplicates: myDuplicates
        })
      });
      if (res.ok) {
        // refresh local db state
        await fetchTrades();
        alert('Inventory Saved!');
      }
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save inventory');
    }
    setIsSaving(false);
  };

  const toggleNeed = (cardId) => {
    if (myNeeds.includes(cardId)) {
      setMyNeeds(myNeeds.filter(id => id !== cardId));
    } else {
      setMyNeeds([...myNeeds, cardId]);
      // Remove from duplicates if added to needs
      setMyDuplicates(myDuplicates.filter(id => id !== cardId));
    }
  };

  const toggleDuplicate = (cardId) => {
    if (myDuplicates.includes(cardId)) {
      setMyDuplicates(myDuplicates.filter(id => id !== cardId));
    } else {
      setMyDuplicates([...myDuplicates, cardId]);
      // Remove from needs if added to duplicates
      setMyNeeds(myNeeds.filter(id => id !== cardId));
    }
  };

  const calculateMatches = () => {
    if (!selectedPlayer) return [];
    
    const matches = [];
    Object.entries(tradesDb).forEach(([otherTag, otherData]) => {
      if (otherTag === selectedPlayer) return; // skip self
      
      // What I can give them (I have duplicate, they need it)
      const iCanGive = myDuplicates.filter(id => otherData.needs.includes(id));
      
      // What they can give me (They have duplicate, I need it)
      const theyCanGive = otherData.duplicates.filter(id => myNeeds.includes(id));
      
      if (iCanGive.length > 0 || theyCanGive.length > 0) {
        matches.push({
          playerTag: otherTag,
          playerName: otherData.name,
          iCanGive,
          theyCanGive,
          isPerfect: iCanGive.length > 0 && theyCanGive.length > 0
        });
      }
    });
    
    // Sort perfect matches first
    return matches.sort((a, b) => (b.isPerfect ? 1 : 0) - (a.isPerfect ? 1 : 0));
  };

  const matches = calculateMatches();
  const getCardName = (id) => cardsData.find(c => c.id === id)?.name || id;

  return (
    <div className="animate-fade-in">
      <div className="glass-panel text-center" style={{ marginBottom: '2rem' }}>
        <h1 className="title-glow" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Clash of Cards Trading</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Select your profile to manage your inventory and find trades!</p>
        
        <select 
          value={selectedPlayer} 
          onChange={(e) => setSelectedPlayer(e.target.value)}
          style={{
            padding: '0.8rem 1.5rem',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            border: '1px solid var(--border-glass)',
            fontSize: '1.1rem',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          <option value="">-- Select Your Player --</option>
          {clanMembers.map(m => (
            <option key={m.tag} value={m.tag}>{m.name} ({m.tag})</option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <button 
              className={`btn-primary ${activeTab === 'inventory' ? '' : 'inactive'}`} 
              onClick={() => setActiveTab('inventory')}
              style={{ opacity: activeTab === 'inventory' ? 1 : 0.5 }}
            >
              My Inventory
            </button>
            <button 
              className={`btn-primary ${activeTab === 'matches' ? '' : 'inactive'}`} 
              onClick={() => setActiveTab('matches')}
              style={{ opacity: activeTab === 'matches' ? 1 : 0.5, background: 'linear-gradient(135deg, var(--coc-dark-elixir), #009977)' }}
            >
              Find Trades
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="glass-panel">
              <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 className="text-gold">Card Inventory</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      color: 'white',
                      border: '1px solid var(--border-glass)',
                    }}
                  >
                    <option value="All">All Troops</option>
                    <option value="Elixir">Elixir</option>
                    <option value="Dark Elixir">Dark Elixir</option>
                    <option value="Super">Super</option>
                    <option value="Builder Base">Builder Base</option>
                  </select>
                  <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Inventory'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {cardsData.filter(c => filterCategory === 'All' || c.category === filterCategory).map(card => {
                  const isNeed = myNeeds.includes(card.id);
                  const isDup = myDuplicates.includes(card.id);
                  
                  return (
                    <div key={card.id} style={{ 
                      background: 'rgba(0,0,0,0.2)', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      borderLeft: `4px solid ${isNeed ? 'var(--coc-elixir)' : isDup ? 'var(--coc-dark-elixir)' : 'var(--border-glass)'}`
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{card.category}</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.8rem' }}>{card.name}</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleNeed(card.id)}
                          style={{
                            flex: 1, padding: '0.4rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: isNeed ? 'var(--coc-elixir)' : 'rgba(255,255,255,0.1)',
                            color: isNeed ? 'white' : 'var(--text-secondary)',
                            fontSize: '0.8rem', fontWeight: 'bold'
                          }}
                        >Need</button>
                        <button 
                          onClick={() => toggleDuplicate(card.id)}
                          style={{
                            flex: 1, padding: '0.4rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: isDup ? 'var(--coc-dark-elixir)' : 'rgba(255,255,255,0.1)',
                            color: isDup ? '#000' : 'var(--text-secondary)',
                            fontSize: '0.8rem', fontWeight: 'bold'
                          }}
                        >Duplicate</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="glass-panel">
              <h2 className="text-dark-elixir" style={{ marginBottom: '1.5rem' }}>Trade Matchmaker</h2>
              
              {matches.length === 0 ? (
                <p className="text-muted text-center py-4">No trades available right now. Check back later when others update their inventory!</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {matches.map(match => (
                    <div key={match.playerTag} style={{ 
                      background: 'rgba(0,0,0,0.2)', 
                      padding: '1.5rem', 
                      borderRadius: '8px',
                      border: match.isPerfect ? '1px solid var(--coc-gold)' : '1px solid var(--border-glass)'
                    }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{match.playerName}</h3>
                        {match.isPerfect && <span style={{ background: 'var(--coc-gold)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Perfect Trade!</span>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div style={{ background: 'rgba(211, 61, 235, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                          <h4 className="text-elixir" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>They Can Give You:</h4>
                          {match.theyCanGive.length > 0 ? (
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                              {match.theyCanGive.map(id => <li key={id}>{getCardName(id)}</li>)}
                            </ul>
                          ) : <p className="text-muted text-sm">Nothing you need.</p>}
                        </div>
                        
                        <div style={{ background: 'rgba(0, 255, 204, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                          <h4 className="text-dark-elixir" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>You Can Give Them:</h4>
                          {match.iCanGive.length > 0 ? (
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                              {match.iCanGive.map(id => <li key={id}>{getCardName(id)}</li>)}
                            </ul>
                          ) : <p className="text-muted text-sm">Nothing they need.</p>}
                        </div>
                      </div>
                      
                      {match.isPerfect && (
                        <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--coc-gold)' }}>
                          Coordinate with <strong>{match.playerName}</strong> in Clan Chat to swap these cards!
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
