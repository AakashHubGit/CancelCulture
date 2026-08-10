"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import cardsData from "@/data/cards.json";

// O(1) lookup map for cards to prevent thousands of Array.find() calls during render
const cardsDataMap = {};
cardsData.forEach((c) => {
  cardsDataMap[c.id] = c;
});

export default function CardsDashboard({ clanMembers = [] }) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [tradesDb, setTradesDb] = useState({});
  const [myNeeds, setMyNeeds] = useState([]);
  const [myDuplicates, setMyDuplicates] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [filterCategory, setFilterCategory] = useState("All");

  const [tradeDepth, setTradeDepth] = useState(4);
  const [expandedChain, setExpandedChain] = useState(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  /*
   * ---------------------------------------------------------
   * BASIC HELPERS
   * ---------------------------------------------------------
   */

  const cardMap = useMemo(() => {
    const map = {};

    cardsData.forEach((card) => {
      map[card.id] = card;
    });

    return map;
  }, []);

  const getCard = (id) => cardMap[id];

  const getCardName = (id) => {
    return cardMap[id]?.name || id;
  };

  const getCardCategory = (id) => {
    return cardMap[id]?.category || "";
  };

  const getCardImage = (id) => {
    return cardMap[id]?.image || "";
  };

  const getPlayerName = (tag) => {
    if (tradesDb[tag]?.name) {
      return tradesDb[tag].name;
    }

    const member = clanMembers.find((m) => m.tag === tag);

    return member?.name || tag;
  };

  const getPlayerInventory = (tag) => {
    return (
      tradesDb[tag] || {
        name: getPlayerName(tag),
        needs: [],
        duplicates: [],
      }
    );
  };

  const timeAgo = (dateString) => {
    if (!dateString) return "Never";
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    if (seconds < 0) return "Just now"; // handles slight client-server clock drifts
    return "Just now";
  };

  /*
   * ---------------------------------------------------------
   * LOAD DATABASE
   * ---------------------------------------------------------
   */

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
      setIsLoadingTrades(true);

      const res = await fetch("/api/cards");

      if (!res.ok) {
        throw new Error("Failed to fetch cards");
      }

      const data = await res.json();

      setTradesDb(data || {});
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INVENTORY
   * ---------------------------------------------------------
   */

  const handleSave = async () => {
    if (!selectedPlayer) return;

    setIsSaving(true);

    const member = clanMembers.find((m) => m.tag === selectedPlayer);

    const playerName =
      member?.name || tradesDb[selectedPlayer]?.name || selectedPlayer;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerTag: selectedPlayer,
          playerName,
          needs: myNeeds,
          duplicates: myDuplicates,
        }),
      });
      if (res.ok) {
        await fetchTrades();
        alert("Inventory Saved!");
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save inventory");
    }
    setIsSaving(false);
  };

  const handleCompleteTrade = async (otherTag, catMatch) => {
    if (
      !confirm(
        "Are you sure you want to mark these cards as traded? This will automatically update both your inventory and their inventory.",
      )
    )
      return;

    const newMyNeeds = myNeeds.filter(
      (id) => !catMatch.theyCanGive.includes(id),
    );
    const newMyDuplicates = myDuplicates.filter(
      (id) => !catMatch.iCanGive.includes(id),
    );

    const otherData = tradesDb[otherTag];
    const newTheirNeeds = otherData.needs.filter(
      (id) => !catMatch.iCanGive.includes(id),
    );
    const newTheirDuplicates = otherData.duplicates.filter(
      (id) => !catMatch.theyCanGive.includes(id),
    );

    const memberMe = clanMembers.find((m) => m.tag === selectedPlayer);

    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerTag: selectedPlayer,
        playerName: memberMe.name,
        needs: newMyNeeds,
        duplicates: newMyDuplicates,
      }),
    });

    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerTag: otherTag,
        playerName: otherData.name,
        needs: newTheirNeeds,
        duplicates: newTheirDuplicates,
      }),
    });

    alert("Trade Completed and Inventories Updated!");
    await fetchTrades();
  };

  const handleCompleteMultiTrade = async (multiTrade) => {
    if (
      !confirm(
        "Execute 3-Way Trade? This will instantly update the inventory for you and both other players.",
      )
    )
      return;

    // Me: Gives cardZ, Receives cardX
    const newMyNeeds = myNeeds.filter((id) => id !== multiTrade.me.receives);
    const newMyDuplicates = myDuplicates.filter(
      (id) => id !== multiTrade.me.gives,
    );

    // Player B: Gives cardY, Receives cardZ
    const dataB = tradesDb[multiTrade.playerB.tag];
    const newNeedsB = dataB.needs.filter(
      (id) => id !== multiTrade.playerB.receives,
    );
    const newDupesB = dataB.duplicates.filter(
      (id) => id !== multiTrade.playerB.gives,
    );

    // Player C: Gives cardX, Receives cardY
    const dataC = tradesDb[multiTrade.playerC.tag];
    const newNeedsC = dataC.needs.filter(
      (id) => id !== multiTrade.playerC.receives,
    );
    const newDupesC = dataC.duplicates.filter(
      (id) => id !== multiTrade.playerC.gives,
    );

    const memberMe = clanMembers.find((m) => m.tag === selectedPlayer);

    // Atomic Bulk Update Array
    const bulkPayload = [
      {
        playerTag: selectedPlayer,
        playerName: memberMe.name,
        needs: newMyNeeds,
        duplicates: newMyDuplicates,
      },
      {
        playerTag: multiTrade.playerB.tag,
        playerName: multiTrade.playerB.name,
        needs: newNeedsB,
        duplicates: newDupesB,
      },
      {
        playerTag: multiTrade.playerC.tag,
        playerName: multiTrade.playerC.name,
        needs: newNeedsC,
        duplicates: newDupesC,
      },
    ];

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkPayload),
      });

      if (res.ok) {
        alert("Multi-Way Trade Completed Successfully!");
        await fetchTrades();
      } else {
        alert("Failed to process multi-way trade.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving multi-way trade.");
    }
  };

  const toggleNeed = useCallback((cardId) => {
    setMyNeeds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
    setMyDuplicates((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : prev,
    );
  }, []);

  const toggleDuplicate = useCallback((cardId) => {
    setMyDuplicates((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
    setMyNeeds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : prev,
    );
  }, []);



  // Memoize heavy calculation to avoid lag on re-renders
  const matches = useMemo(() => {
    if (!selectedPlayer) return [];

    // Direct Matches
    const directMatches = [];
    Object.entries(tradesDb).forEach(([otherTag, otherData]) => {
      if (otherTag === selectedPlayer) return;

      const iCanGiveAll = myDuplicates.filter((id) =>
        otherData.needs.includes(id),
      );
      const theyCanGiveAll = otherData.duplicates.filter((id) =>
        myNeeds.includes(id),
      );

      const categories = ["Elixir", "Dark Elixir", "Super", "Builder Base"];
      const categoryMatches = [];

      categories.forEach((cat) => {
        const iCanGive = iCanGiveAll.filter(
          (id) => getCardCategory(id) === cat,
        );
        const theyCanGive = theyCanGiveAll.filter(
          (id) => getCardCategory(id) === cat,
        );

        if (iCanGive.length > 0 && theyCanGive.length > 0) {
          categoryMatches.push({
            category: cat,
            iCanGive,
            theyCanGive,
            isPerfect: true,
          });
        }
      });

      if (categoryMatches.length > 0) {
        directMatches.push({
          playerTag: otherTag,
          playerName: otherData.name || getPlayerName(otherTag),
          categoryMatches,
          isPerfect: true,
        });
      }
    });

    // 3-Way Multi Matches
    const multiMatches = [];
    const categories = ["Elixir", "Dark Elixir", "Super", "Builder Base"];

    categories.forEach((cat) => {
      const myNeedsInCat = myNeeds.filter((id) => getCardCategory(id) === cat);
      const myDupesInCat = myDuplicates.filter(
        (id) => getCardCategory(id) === cat,
      );

      myNeedsInCat.forEach((cardX) => {
        // Who has Card X as a duplicate? -> Potential Player C
        Object.entries(tradesDb).forEach(([playerCTag, playerCData]) => {
          if (playerCTag === selectedPlayer) return;
          if (!playerCData.duplicates.includes(cardX)) return;

          const playerCNeedsInCat = playerCData.needs.filter(
            (id) => getCardCategory(id) === cat,
          );

          playerCNeedsInCat.forEach((cardY) => {
            // Who has Card Y as a duplicate? -> Potential Player B
            Object.entries(tradesDb).forEach(([playerBTag, playerBData]) => {
              if (playerBTag === selectedPlayer || playerBTag === playerCTag)
                return;
              if (!playerBData.duplicates.includes(cardY)) return;

              const playerBNeedsInCat = playerBData.needs.filter(
                (id) => getCardCategory(id) === cat,
              );

              playerBNeedsInCat.forEach((cardZ) => {
                // Do I have Card Z as a duplicate?
                if (myDupesInCat.includes(cardZ)) {
                  // Wait, check if a direct match already handles this Z and X swap.
                  // If playerBTag happens to need Z and gives X, that's a 2-way direct match, no need for 3-way.
                  // But B needs Z and gives Y. C needs Y and gives X. This is a true 3-way.

                  const cycleKey = `${cat}-${playerBTag}-${playerCTag}-${cardZ}-${cardY}-${cardX}`;
                  if (!multiMatches.some((m) => m.key === cycleKey)) {
                    multiMatches.push({
                      key: cycleKey,
                      category: cat,
                      playerB: {
                        tag: playerBTag,
                        name: playerBData.name,
                        receives: cardZ,
                        gives: cardY,
                      },
                      playerC: {
                        tag: playerCTag,
                        name: playerCData.name,
                        receives: cardY,
                        gives: cardX,
                      },
                      me: { receives: cardX, gives: cardZ },
                    });
                  }
                }
              });
            });
          });
        });
      });
    });

    return { directMatches, multiMatches };
  }, [selectedPlayer, tradesDb, myNeeds, myDuplicates]);

  // Memoize filtered inventory to avoid lag when toggling pills
  const filteredCards = useMemo(() => {
    return cardsData.filter(
      (c) => filterCategory === "All" || c.category === filterCategory,
    );
  }, [filterCategory]);

  return (
    <div className="animate-stagger">
      <div className="glass-panel text-center" style={{ marginBottom: "2rem", position: "relative", zIndex: 100 }}>
        <h1
          className="title-glow"
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            letterSpacing: "-1px",
          }}
        >
          Clash of Cards
        </h1>
        <p
          className="text-muted"
          style={{ fontSize: "1.1rem", marginBottom: "2rem" }}
        >
          Select your profile to manage your inventory and find trades!
        </p>

        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', zIndex: 50 }}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              padding: "1rem 2rem",
              borderRadius: "100px",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              border: "1px solid var(--border-glass)",
              fontSize: "1.2rem",
              fontWeight: "600",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {selectedPlayer ? (
              <span>{clanMembers.find((m) => m.tag === selectedPlayer)?.name || selectedPlayer}</span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>-- Select Your Player --</span>
            )}
            <span style={{ fontSize: '0.8rem', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>

          {isDropdownOpen && (
            <div 
              className="glass-panel animate-stagger"
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                maxHeight: '350px',
                overflowY: 'auto',
                zIndex: 1000,
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              }}
            >
              {clanMembers.map((m) => {
                const dbEntry = tradesDb[m.tag];
                const lastUpdated = dbEntry?.lastUpdated;
                
                let timeColor = 'var(--text-muted)';
                if (lastUpdated) {
                   const hours = Math.floor((new Date() - new Date(lastUpdated)) / 3600000);
                   if (hours < 24) timeColor = 'var(--coc-elixir)'; // Fresh
                   else if (hours < 72) timeColor = 'var(--coc-gold)'; // Medium
                   else timeColor = '#ff4444'; // Stale
                }

                return (
                  <div 
                    key={m.tag}
                    onClick={() => {
                      setSelectedPlayer(m.tag);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: selectedPlayer === m.tag ? 'rgba(255,193,7,0.1)' : 'rgba(0,0,0,0.4)',
                      border: selectedPlayer === m.tag ? '1px solid var(--coc-gold)' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlayer !== m.tag) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlayer !== m.tag) e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: selectedPlayer === m.tag ? 'var(--coc-gold)' : 'white' }}>{m.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.tag}</span>
                    </div>
                    
                    {lastUpdated ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: `1px solid ${timeColor}` }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: timeColor, fontWeight: 'bold' }}>
                          🕒 {timeAgo(lastUpdated)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--text-muted)' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          No Data
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <>
          <div className="flex justify-center" style={{ marginBottom: "2rem" }}>
            <div className="segmented-control">
              <div
                className="segment-active-bg"
                style={{
                  width: "50%",
                  left: activeTab === "inventory" ? "0" : "50%",
                }}
              />
              <button
                className={`segment-btn ${activeTab === "inventory" ? "active" : ""}`}
                onClick={() => setActiveTab("inventory")}
              >
                My Inventory
              </button>
              <button
                className={`segment-btn ${activeTab === "matches" ? "active" : ""}`}
                onClick={() => setActiveTab("matches")}
              >
                Find Trades
              </button>
            </div>
          </div>

          {activeTab === "inventory" && (
            <div className="glass-panel animate-stagger">
              <div
                className="flex justify-between items-center flex-col-mobile"
                style={{ marginBottom: "2rem" }}
              >
                <h2 className="title-glow" style={{ fontSize: "2rem" }}>
                  Your Collection
                </h2>
                <div className="flex flex-col-mobile w-full-mobile gap-4">
                  <select
                    className="w-full-mobile"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                      padding: "0.8rem 1.5rem",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      color: "white",
                      border: "1px solid var(--border-glass)",
                      fontWeight: "600",
                    }}
                  >
                    <option value="All" style={{ color: "#000" }}>
                      All Troops
                    </option>
                    <option value="Elixir" style={{ color: "#000" }}>
                      Elixir
                    </option>
                    <option value="Dark Elixir" style={{ color: "#000" }}>
                      Dark Elixir
                    </option>
                    <option value="Super" style={{ color: "#000" }}>
                      Super
                    </option>
                    <option value="Builder Base" style={{ color: "#000" }}>
                      Builder Base
                    </option>
                  </select>
                  <button
                    className="btn-primary w-full-mobile"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Collection"}
                  </button>
                </div>
              </div>

              {/* BUCKETS / DROP-ZONES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* NEED BUCKET */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--coc-elixir)' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'white' }}>Cards I Need ({myNeeds.length})</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '45px' }}>
                    {myNeeds.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: '0.9rem' }}>Select cards from the roster below...</span>
                    ) : (
                      myNeeds.map(id => (
                        <div key={id} onClick={() => toggleNeed(id)} style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--coc-elixir)', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover-scale" title={`Remove ${getCardName(id)}`}>
                          <img src={`/troops/${getCardImage(id)}`} alt={getCardName(id)} style={{width:'100%', height:'100%', objectFit:'cover'}} onError={(e) => { e.target.style.display = "none"; }} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GIVE BUCKET */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--coc-builder)' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'white' }}>Cards I Can Give ({myDuplicates.length})</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '45px' }}>
                    {myDuplicates.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: '0.9rem' }}>Select cards from the roster below...</span>
                    ) : (
                      myDuplicates.map(id => (
                        <div key={id} onClick={() => toggleDuplicate(id)} style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--coc-builder)', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover-scale" title={`Remove ${getCardName(id)}`}>
                          <img src={`/troops/${getCardImage(id)}`} alt={getCardName(id)} style={{width:'100%', height:'100%', objectFit:'cover'}} onError={(e) => { e.target.style.display = "none"; }} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-auto-fit gap-4">
                {filteredCards.map((card) => {
                  const isNeed = myNeeds.includes(card.id);
                  const isDup = myDuplicates.includes(card.id);

                  let cardClass = "";
                  if (card.category === "Elixir") cardClass = "card-elixir";
                  if (card.category === "Dark Elixir") cardClass = "card-dark";
                  if (card.category === "Super") cardClass = "card-super";
                  if (card.category === "Builder Base")
                    cardClass = "card-builder";

                  return (
                    <div key={card.id} className={`trade-card ${cardClass}`}>
                      <div className="card-img-wrapper">
                        <img
                          src={`/troops/${card.image}`}
                          alt={card.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          color: "var(--text-muted)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {card.category}
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          marginBottom: "1.2rem",
                          textAlign: "center",
                        }}
                      >
                        {card.name}
                      </div>

                      <div
                        className="w-full-mobile flex gap-2"
                        style={{ width: "100%" }}
                      >
                        <button
                          className={`toggle-pill ${isNeed ? "active-need" : ""}`}
                          onClick={() => toggleNeed(card.id)}
                        >
                          {isNeed ? "✓ Needed" : "Need"}
                        </button>
                        <button
                          className={`toggle-pill ${isDup ? "active-dup" : ""}`}
                          onClick={() => toggleDuplicate(card.id)}
                        >
                          {isDup ? "✓ Dupe" : "Dupe"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "matches" && (
            <div className="glass-panel animate-stagger">
              <h2
                className="title-glow"
                style={{ fontSize: "2rem", marginBottom: "2rem" }}
              >
                Trade Matchmaker
              </h2>

              {matches.directMatches.length === 0 &&
              matches.multiMatches.length === 0 ? (
                <p
                  className="text-muted text-center py-4"
                  style={{ fontSize: "1.2rem" }}
                >
                  No trades available right now. Check back later when others
                  update their inventory!
                </p>
              ) : (
                <div className="trade-layout-grid">
                  {/* DIRECT MATCHES */}
                  {matches.directMatches.length > 0 && (
                    <div>
                      <h3
                        className="text-elixir"
                        style={{
                          fontSize: "1.5rem",
                          marginBottom: "1.5rem",
                          borderBottom: "1px solid var(--border-glass)",
                          paddingBottom: "0.5rem",
                        }}
                      >
                        Direct 1:1 Swaps
                      </h3>
                      <div className="flex flex-col gap-4">
                        {matches.directMatches.map((match) => (
                          <div
                            key={match.playerTag}
                            className="glass-panel"
                            style={{
                              padding: "2rem",
                              background: "rgba(0,0,0,0.4)",
                            }}
                          >
                            <div
                              className="flex justify-between items-center"
                              style={{ marginBottom: "1.5rem" }}
                            >
                              <h3
                                style={{
                                  fontSize: "1.5rem",
                                  fontWeight: "800",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "1rem",
                                  }}
                                >
                                  Trade with
                                </span>{" "}
                                {match.playerName}
                              </h3>
                            </div>

                            {match.categoryMatches.map((catMatch, idx) => (
                              <div key={idx} style={{ marginBottom: "2rem" }}>
                                <div
                                  className="flex justify-between items-center flex-col-mobile"
                                  style={{ marginBottom: "1rem" }}
                                >
                                  <div
                                    style={{
                                      fontSize: "1rem",
                                      textTransform: "uppercase",
                                      color: "var(--coc-gold)",
                                      fontWeight: "800",
                                      letterSpacing: "1px",
                                    }}
                                  >
                                    {catMatch.category} Trade ★
                                  </div>
                                  <button
                                    className="btn-primary"
                                    onClick={() =>
                                      handleCompleteTrade(
                                        match.playerTag,
                                        catMatch,
                                      )
                                    }
                                    style={{
                                      padding: "0.5rem 1rem",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    Mark Trade Complete ✓
                                  </button>
                                </div>

                                <div className="vs-screen">
                                  <div className="vs-side vs-left">
                                    <h4
                                      className="text-dark-elixir"
                                      style={{
                                        fontSize: "0.9rem",
                                        marginBottom: "1.5rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "1px",
                                        textAlign: "center",
                                      }}
                                    >
                                      You Give Them
                                    </h4>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "1rem",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {catMatch.iCanGive.map((id) => (
                                        <div
                                          key={id}
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            width: "70px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: "60px",
                                              height: "60px",
                                              borderRadius: "12px",
                                              background: "rgba(0,0,0,0.6)",
                                              overflow: "hidden",
                                              boxShadow:
                                                "inset 0 2px 10px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)",
                                              border:
                                                "1px solid var(--border-glass)",
                                            }}
                                          >
                                            <img
                                              src={`/troops/${getCardImage(id)}`}
                                              alt={getCardName(id)}
                                              style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                              }}
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          </div>
                                          <span
                                            style={{
                                              fontSize: "0.75rem",
                                              fontWeight: "600",
                                              textAlign: "center",
                                              color: "var(--text-primary)",
                                              lineHeight: "1.2",
                                            }}
                                          >
                                            {getCardName(id)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="vs-center"></div>

                                  <div className="vs-side vs-right">
                                    <h4
                                      className="text-elixir"
                                      style={{
                                        fontSize: "0.9rem",
                                        marginBottom: "1.5rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "1px",
                                        textAlign: "center",
                                      }}
                                    >
                                      They Give You
                                    </h4>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "1rem",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {catMatch.theyCanGive.map((id) => (
                                        <div
                                          key={id}
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            width: "70px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: "60px",
                                              height: "60px",
                                              borderRadius: "12px",
                                              background: "rgba(0,0,0,0.6)",
                                              overflow: "hidden",
                                              boxShadow:
                                                "inset 0 2px 10px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)",
                                              border:
                                                "1px solid var(--border-glass)",
                                            }}
                                          >
                                            <img
                                              src={`/troops/${getCardImage(id)}`}
                                              alt={getCardName(id)}
                                              style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                              }}
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          </div>
                                          <span
                                            style={{
                                              fontSize: "0.75rem",
                                              fontWeight: "600",
                                              textAlign: "center",
                                              color: "var(--text-primary)",
                                              lineHeight: "1.2",
                                            }}
                                          >
                                            {getCardName(id)}
                                          </span>
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
                    </div>
                  )}

                  {/* MULTI-WAY MATCHES */}
                  {matches.multiMatches.length > 0 && (
                    <div>
                      <h3
                        className="text-gold"
                        style={{
                          fontSize: "1.5rem",
                          marginBottom: "1.5rem",
                          borderBottom: "1px solid var(--border-glass)",
                          paddingBottom: "0.5rem",
                        }}
                      >
                        3-Way Cycles
                      </h3>
                      <div className="flex flex-col gap-4">
                        {matches.multiMatches.map((multiTrade, idx) => (
                          <div
                            key={idx}
                            className="glass-panel"
                            style={{
                              padding: "1.5rem",
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(255,193,7,0.3)",
                            }}
                          >
                            <div
                              className="flex justify-between items-center flex-col-mobile"
                              style={{ marginBottom: "1.5rem" }}
                            >
                              <div
                                style={{
                                  fontSize: "1rem",
                                  textTransform: "uppercase",
                                  color: "var(--coc-gold)",
                                  fontWeight: "800",
                                  letterSpacing: "1px",
                                }}
                              >
                                {multiTrade.category} 3-Way ♻️
                              </div>
                              <button
                                className="btn-primary"
                                onClick={() =>
                                  handleCompleteMultiTrade(multiTrade)
                                }
                                style={{
                                  padding: "0.5rem 1rem",
                                  fontSize: "0.9rem",
                                  background:
                                    "linear-gradient(135deg, #ff8c00, #ff5722)",
                                }}
                              >
                                Execute Trade ✓
                              </button>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                              }}
                            >
                              {/* YOU */}
                              <div
                                className="glass-panel"
                                style={{
                                  background: "rgba(0,0,0,0.6)",
                                  padding: "1rem",
                                  borderLeft:
                                    "4px solid var(--coc-dark-elixir)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                    marginBottom: "1rem",
                                    textAlign: "center",
                                  }}
                                >
                                  You
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Give to {multiTrade.playerB.name}
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.me.gives)}`}
                                        alt="give"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.me.gives)}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      color: "var(--text-muted)",
                                      fontSize: "1.5rem",
                                      alignSelf: "center",
                                    }}
                                  >
                                    ⇄
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Receive from {multiTrade.playerC.name}
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.me.receives)}`}
                                        alt="receive"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.me.receives)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* PLAYER B */}
                              <div
                                className="glass-panel"
                                style={{
                                  background: "rgba(0,0,0,0.6)",
                                  padding: "1rem",
                                  borderLeft: "4px solid var(--coc-builder)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                    marginBottom: "1rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {multiTrade.playerB.name}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Give to {multiTrade.playerC.name}
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.playerB.gives)}`}
                                        alt="give"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.playerB.gives)}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      color: "var(--text-muted)",
                                      fontSize: "1.5rem",
                                      alignSelf: "center",
                                    }}
                                  >
                                    ⇄
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Receive from You
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.playerB.receives)}`}
                                        alt="receive"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.playerB.receives)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* PLAYER C */}
                              <div
                                className="glass-panel"
                                style={{
                                  background: "rgba(0,0,0,0.6)",
                                  padding: "1rem",
                                  borderLeft: "4px solid var(--coc-elixir)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                    marginBottom: "1rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {multiTrade.playerC.name}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Give to You
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.playerC.gives)}`}
                                        alt="give"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.playerC.gives)}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      color: "var(--text-muted)",
                                      fontSize: "1.5rem",
                                      alignSelf: "center",
                                    }}
                                  >
                                    ⇄
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      width: "45%",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        textTransform: "uppercase",
                                        textAlign: "center",
                                        minHeight: "30px",
                                      }}
                                    >
                                      Receive from {multiTrade.playerB.name}
                                    </span>
                                    <div
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        margin: "0.5rem 0",
                                        border: "1px solid var(--border-glass)",
                                      }}
                                    >
                                      <img
                                        src={`/troops/${getCardImage(multiTrade.playerC.receives)}`}
                                        alt="receive"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                      }}
                                    >
                                      {getCardName(multiTrade.playerC.receives)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* EXECUTION PLAN */}
                              <details style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px dashed var(--coc-gold)', cursor: 'pointer' }}>
                                <summary style={{ color: 'var(--coc-gold)', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}>
                                  🎮 Show Execution Plan (How to Trade in-game)
                                </summary>
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,193,7,0.2)', marginTop: '0.5rem' }}>
                                  <ol style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
                                    <li><strong>Step 1:</strong> You post a trade in clan chat offering <strong className="text-dark-elixir">{getCardName(multiTrade.me.gives)}</strong> and requesting <strong className="text-builder">{getCardName(multiTrade.playerB.gives)}</strong> (Bridge Card).</li>
                                    <li><strong>Step 2:</strong> <strong>{multiTrade.playerB.name}</strong> accepts your trade. <span className="text-muted">(You temporarily receive the bridge card)</span>.</li>
                                    <li><strong>Step 3:</strong> You post a second trade offering the <strong className="text-builder">{getCardName(multiTrade.playerB.gives)}</strong> and requesting <strong className="text-elixir">{getCardName(multiTrade.me.receives)}</strong>.</li>
                                    <li><strong>Step 4:</strong> <strong>{multiTrade.playerC.name}</strong> accepts your trade. Everyone gets exactly what they need!</li>
                                  </ol>
                                </div>
                              </details>
                              
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
