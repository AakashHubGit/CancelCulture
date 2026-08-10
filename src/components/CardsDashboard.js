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
        await fetchTrades();
        alert('Inventory Saved!');
      }
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save inventory');
    }
    setIsSaving(false);
  };

  const handleCompleteTrade = async (otherTag, catMatch) => {
    if (!confirm('Are you sure you want to mark these cards as traded? This will automatically update both your inventory and their inventory.')) return;
    
    const newMyNeeds = myNeeds.filter(id => !catMatch.theyCanGive.includes(id));
    const newMyDuplicates = myDuplicates.filter(id => !catMatch.iCanGive.includes(id));
    
    const otherData = tradesDb[otherTag];
    const newTheirNeeds = otherData.needs.filter(id => !catMatch.iCanGive.includes(id));
    const newTheirDuplicates = otherData.duplicates.filter(id => !catMatch.theyCanGive.includes(id));

    const memberMe = clanMembers.find(m => m.tag === selectedPlayer);
    
    await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerTag: selectedPlayer,
        playerName: memberMe.name,
        needs: newMyNeeds,
        duplicates: newMyDuplicates
      })
    });

    await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerTag: otherTag,
        playerName: otherData.name,
        needs: newTheirNeeds,
        duplicates: newTheirDuplicates
      })
    });

    alert('Trade Completed and Inventories Updated!');
    await fetchTrades();
  };

  const toggleNeed = (cardId) => {
    if (myNeeds.includes(cardId)) {
      setMyNeeds(myNeeds.filter(id => id !== cardId));
    } else {
      setMyNeeds([...myNeeds, cardId]);
      setMyDuplicates(myDuplicates.filter(id => id !== cardId));
    }
  };

  const toggleDuplicate = (cardId) => {
    if (myDuplicates.includes(cardId)) {
      setMyDuplicates(myDuplicates.filter(id => id !== cardId));
    } else {
      setMyDuplicates([...myDuplicates, cardId]);
      setMyNeeds(myNeeds.filter(id => id !== cardId));
    }
  };

  const getCardCategory = (id) => cardsData.find(c => c.id === id)?.category || '';
  const getCardName = (id) => cardsData.find(c => c.id === id)?.name || id;
  const getCardImage = (id) => cardsData.find(c => c.id === id)?.image || '';

  const calculateMatches = () => {
    if (!selectedPlayer) return [];
    
    const matches = [];
    Object.entries(tradesDb).forEach(([otherTag, otherData]) => {
      if (otherTag === selectedPlayer) return; 
      
      const iCanGiveAll = myDuplicates.filter(id => otherData.needs.includes(id));
      const theyCanGiveAll = otherData.duplicates.filter(id => myNeeds.includes(id));
      
      const categories = ['Elixir', 'Dark Elixir', 'Super', 'Builder Base'];
      const categoryMatches = [];

      categories.forEach(cat => {
        const iCanGive = iCanGiveAll.filter(id => getCardCategory(id) === cat);
        const theyCanGive = theyCanGiveAll.filter(id => getCardCategory(id) === cat);

        // ONLY push if it is a PERFECT swap (both sides have cards in this category)
        if (iCanGive.length > 0 && theyCanGive.length > 0) {
          categoryMatches.push({ category: cat, iCanGive, theyCanGive, isPerfect: true });
        }
      });
      
      if (categoryMatches.length > 0) {
        matches.push({
          playerTag: otherTag,
          playerName: otherData.name,
          categoryMatches,
          isPerfect: true
        });
      }
    });
    
    return matches;
  };

  const matches = calculateMatches();

  return (
    <div className="animate-stagger">
      <div className="glass-panel text-center" style={{ marginBottom: '2rem' }}>
        <h1 className="title-glow" style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '-1px' }}>Clash of Cards</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>Select your profile to manage your inventory and find trades!</p>
        
        <select 
          value={selectedPlayer} 
          onChange={(e) => setSelectedPlayer(e.target.value)}
          style={{
            padding: '1rem 2rem',
            borderRadius: '100px',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            border: '1px solid var(--border-glass)',
            fontSize: '1.2rem',
            fontWeight: '600',
            width: '100%',
            maxWidth: '500px',
            outline: 'none',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ color: '#000' }}>-- Select Your Player --</option>
          {clanMembers.map(m => (
            <option key={m.tag} value={m.tag} style={{ color: '#000' }}>{m.name} ({m.tag})</option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <>
          <div className="flex justify-center" style={{ marginBottom: '2rem' }}>
            <div className="segmented-control">
              <div 
                className="segment-active-bg" 
                style={{ 
                  width: '50%', 
                  left: activeTab === 'inventory' ? '0' : '50%' 
                }} 
              />
              <button 
                className={`segment-btn ${activeTab === 'inventory' ? 'active' : ''}`} 
                onClick={() => setActiveTab('inventory')}
              >
                My Inventory
              </button>
              <button 
                className={`segment-btn ${activeTab === 'matches' ? 'active' : ''}`} 
                onClick={() => setActiveTab('matches')}
              >
                Find Trades
              </button>
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="glass-panel animate-stagger">
              <div className="flex justify-between items-center flex-col-mobile" style={{ marginBottom: '2rem' }}>
                <h2 className="title-glow" style={{ fontSize: '2rem' }}>Your Collection</h2>
                <div className="flex flex-col-mobile w-full-mobile gap-4">
                  <select 
                    className="w-full-mobile"
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                      padding: '0.8rem 1.5rem',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.4)',
                      color: 'white',
                      border: '1px solid var(--border-glass)',
                      fontWeight: '600'
                    }}
                  >
                    <option value="All" style={{ color: '#000' }}>All Troops</option>
                    <option value="Elixir" style={{ color: '#000' }}>Elixir</option>
                    <option value="Dark Elixir" style={{ color: '#000' }}>Dark Elixir</option>
                    <option value="Super" style={{ color: '#000' }}>Super</option>
                    <option value="Builder Base" style={{ color: '#000' }}>Builder Base</option>
                  </select>
                  <button className="btn-primary w-full-mobile" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Collection'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-auto-fit gap-4">
                {cardsData.filter(c => filterCategory === 'All' || c.category === filterCategory).map(card => {
                  const isNeed = myNeeds.includes(card.id);
                  const isDup = myDuplicates.includes(card.id);
                  
                  let cardClass = '';
                  if (card.category === 'Elixir') cardClass = 'card-elixir';
                  if (card.category === 'Dark Elixir') cardClass = 'card-dark';
                  if (card.category === 'Super') cardClass = 'card-super';
                  if (card.category === 'Builder Base') cardClass = 'card-builder';
                  
                  return (
                    <div key={card.id} className={`trade-card ${cardClass}`}>
                      <div className="card-img-wrapper">
                        <img 
                          src={`/troops/${card.image}`} 
                          alt={card.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        {card.category}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.2rem', textAlign: 'center' }}>
                        {card.name}
                      </div>
                      
                      <div className="w-full-mobile flex gap-2" style={{ width: '100%' }}>
                        <button 
                          className={`toggle-pill ${isNeed ? 'active-need' : ''}`}
                          onClick={() => toggleNeed(card.id)}
                        >
                          {isNeed ? '✓ Needed' : 'Need'}
                        </button>
                        <button 
                          className={`toggle-pill ${isDup ? 'active-dup' : ''}`}
                          onClick={() => toggleDuplicate(card.id)}
                        >
                          {isDup ? '✓ Dupe' : 'Dupe'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="glass-panel animate-stagger">
              <h2 className="title-glow" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Trade Matchmaker</h2>
              
              {matches.length === 0 ? (
                <p className="text-muted text-center py-4" style={{ fontSize: '1.2rem' }}>No trades available right now. Check back later when others update their inventory!</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {matches.map(match => (
                    <div key={match.playerTag} className="glass-panel" style={{ padding: '2rem', background: 'rgba(0,0,0,0.4)' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Trade with</span> {match.playerName}
                        </h3>
                      </div>
                      
                      {match.categoryMatches.map((catMatch, idx) => (
                        <div key={idx} style={{ marginBottom: '2rem' }}>
                          <div className="flex justify-between items-center flex-col-mobile" style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--coc-gold)', fontWeight: '800', letterSpacing: '1px' }}>
                              {catMatch.category} Trade ★
                            </div>
                            <button 
                              className="btn-primary"
                              onClick={() => handleCompleteTrade(match.playerTag, catMatch)}
                              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                              Mark Trade Complete ✓
                            </button>
                          </div>
                          
                          <div className="vs-screen">
                            <div className="vs-side vs-left">
                              <h4 className="text-dark-elixir" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>You Give Them</h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                                {catMatch.iCanGive.map(id => (
                                  <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '70px' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,0,0,0.6)', overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)', border: '1px solid var(--border-glass)' }}>
                                      <img src={`/troops/${getCardImage(id)}`} alt={getCardName(id)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', textAlign: 'center', color: 'var(--text-primary)', lineHeight: '1.2' }}>{getCardName(id)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="vs-center"></div>
                            
                            <div className="vs-side vs-right">
                              <h4 className="text-elixir" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>They Give You</h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                                {catMatch.theyCanGive.map(id => (
                                  <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '70px' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,0,0,0.6)', overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)', border: '1px solid var(--border-glass)' }}>
                                      <img src={`/troops/${getCardImage(id)}`} alt={getCardName(id)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', textAlign: 'center', color: 'var(--text-primary)', lineHeight: '1.2' }}>{getCardName(id)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
