"use client";

import { useState, useEffect, useMemo } from "react";
import cardsData from "@/data/cards.json";

const MAX_CHAIN_LENGTH = 5;
const MAX_CHAINS_TO_SHOW = 12;

const CATEGORIES = [
  "Elixir",
  "Dark Elixir",
  "Super",
  "Builder Base",
];

const CARD_STATE = {
  NEED: "need",
  DUPLICATE: "duplicate",
  NEUTRAL: "neutral",
};

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

    const member = clanMembers.find(
      (m) => m.tag === selectedPlayer
    );

    const playerName =
      member?.name ||
      tradesDb[selectedPlayer]?.name ||
      selectedPlayer;

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

      if (!res.ok) {
        throw new Error("Save failed");
      }

      await fetchTrades();

      alert("Inventory Saved!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save inventory");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNeed = (cardId) => {
    if (myNeeds.includes(cardId)) {
      setMyNeeds(
        myNeeds.filter((id) => id !== cardId)
      );
    } else {
      setMyNeeds([...myNeeds, cardId]);

      setMyDuplicates(
        myDuplicates.filter((id) => id !== cardId)
      );
    }
  };

  const toggleDuplicate = (cardId) => {
    if (myDuplicates.includes(cardId)) {
      setMyDuplicates(
        myDuplicates.filter((id) => id !== cardId)
      );
    } else {
      setMyDuplicates([
        ...myDuplicates,
        cardId,
      ]);

      setMyNeeds(
        myNeeds.filter((id) => id !== cardId)
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CARD STATE
   * ---------------------------------------------------------
   */

  const getCardState = (playerTag, cardId) => {
    const player = getPlayerInventory(playerTag);

    if (player.needs?.includes(cardId)) {
      return CARD_STATE.NEED;
    }

    if (player.duplicates?.includes(cardId)) {
      return CARD_STATE.DUPLICATE;
    }

    return CARD_STATE.NEUTRAL;
  };

  /*
   * ---------------------------------------------------------
   * IMPORTANT:
   *
   * A player can give:
   *
   * 1. Duplicate card
   * 2. Neutral card
   *
   * But NEVER a card they explicitly need.
   * ---------------------------------------------------------
   */

  const canPlayerGiveCard = (
    playerTag,
    cardId,
    allowNeutral = true
  ) => {
    const state = getCardState(
      playerTag,
      cardId
    );

    if (state === CARD_STATE.NEED) {
      return false;
    }

    if (state === CARD_STATE.DUPLICATE) {
      return true;
    }

    return allowNeutral;
  };

  /*
   * ---------------------------------------------------------
   * DIRECT MATCHES
   * ---------------------------------------------------------
   */

  const calculateDirectMatches = () => {
    if (!selectedPlayer) {
      return [];
    }

    const matches = [];

    Object.entries(tradesDb).forEach(
      ([otherTag, otherData]) => {
        if (otherTag === selectedPlayer) {
          return;
        }

        const iCanGive = myDuplicates.filter(
          (cardId) =>
            otherData.needs?.includes(cardId)
        );

        const theyCanGive =
          (otherData.duplicates || []).filter(
            (cardId) =>
              myNeeds.includes(cardId)
          );

        if (
          iCanGive.length === 0 &&
          theyCanGive.length === 0
        ) {
          return;
        }

        const categories = {};

        [
          ...iCanGive,
          ...theyCanGive,
        ].forEach((cardId) => {
          const category =
            getCardCategory(cardId);

          if (!categories[category]) {
            categories[category] = {
              category,
              iCanGive: [],
              theyCanGive: [],
            };
          }
        });

        iCanGive.forEach((cardId) => {
          categories[
            getCardCategory(cardId)
          ].iCanGive.push(cardId);
        });

        theyCanGive.forEach((cardId) => {
          categories[
            getCardCategory(cardId)
          ].theyCanGive.push(cardId);
        });

        const categoryMatches =
          Object.values(categories);

        const perfect =
          iCanGive.length > 0 &&
          theyCanGive.length > 0;

        matches.push({
          playerTag: otherTag,
          playerName:
            otherData.name ||
            getPlayerName(otherTag),
          iCanGive,
          theyCanGive,
          categoryMatches,
          isPerfect: perfect,
        });
      }
    );

    return matches.sort(
      (a, b) =>
        Number(b.isPerfect) -
        Number(a.isPerfect)
    );
  };

  /*
   * ---------------------------------------------------------
   * TRADE GRAPH
   *
   * Creates:
   *
   * PLAYER A
   *    |
   *    | Barbarian
   *    v
   * PLAYER B
   *
   * Meaning:
   * A can give Barbarian to B.
   * ---------------------------------------------------------
   */

  const buildTradeGraph = () => {
    const graph = {};

    Object.keys(tradesDb).forEach(
      (playerTag) => {
        graph[playerTag] = [];
      }
    );

    Object.entries(tradesDb).forEach(
      ([fromTag, fromPlayer]) => {
        Object.entries(tradesDb).forEach(
          ([toTag, toPlayer]) => {
            if (fromTag === toTag) {
              return;
            }

            cardsData.forEach((card) => {
              const state =
                getCardState(
                  fromTag,
                  card.id
                );

              const receiverNeeds =
                toPlayer.needs?.includes(
                  card.id
                );

              if (!receiverNeeds) {
                return;
              }

              /*
               * Duplicate = strongest edge
               */
              if (
                state ===
                CARD_STATE.DUPLICATE
              ) {
                graph[fromTag].push({
                  from: fromTag,
                  to: toTag,
                  cardId: card.id,
                  cardName: card.name,
                  type: "duplicate",
                  score: 100,
                });
              }

              /*
               * Neutral = strategic edge
               */
              if (
                state ===
                CARD_STATE.NEUTRAL
              ) {
                graph[fromTag].push({
                  from: fromTag,
                  to: toTag,
                  cardId: card.id,
                  cardName: card.name,
                  type: "strategic",
                  score: 60,
                });
              }
            });
          }
        );
      }
    );

    return graph;
  };

  /*
   * ---------------------------------------------------------
   * TRADE CHAIN SEARCH
   *
   * We search for cycles:
   *
   * A -> B -> C -> A
   *
   * Each arrow represents:
   *
   * "This player gives a card that the next
   * player needs."
   *
   * The final player must give something
   * that the original player needs.
   * ---------------------------------------------------------
   */

  const findTradeChains = (
    startPlayer,
    maxDepth = 4
  ) => {
    if (!startPlayer) {
      return [];
    }

    const graph = buildTradeGraph();

    const chains = [];

    const dfs = (
      currentPlayer,
      path,
      visitedPlayers,
      usedCards
    ) => {
      if (path.length >= maxDepth) {
        return;
      }

      const edges =
        graph[currentPlayer] || [];

      for (const edge of edges) {
        /*
         * Don't reuse a card inside one chain.
         */
        if (
          usedCards.has(edge.cardId)
        ) {
          continue;
        }

        /*
         * Closing the cycle.
         *
         * The current player must give a card
         * that START PLAYER needs.
         */
        if (
          edge.to === startPlayer
        ) {
          const finalIsNeeded =
            myNeeds.includes(
              edge.cardId
            );

          if (
            !finalIsNeeded ||
            path.length < 1
          ) {
            continue;
          }

          const completedChain = [
            ...path,
            edge,
          ];

          /*
           * Avoid duplicates such as
           *
           * A -> B -> C -> A
           *
           * and
           *
           * A -> C -> B -> A
           *
           * being treated identically.
           */
          chains.push(
            completedChain
          );

          continue;
        }

        /*
         * Don't visit the same player twice.
         */
        if (
          visitedPlayers.has(edge.to)
        ) {
          continue;
        }

        dfs(
          edge.to,
          [...path, edge],
          new Set([
            ...visitedPlayers,
            edge.to,
          ]),
          new Set([
            ...usedCards,
            edge.cardId,
          ])
        );
      }
    };

    dfs(
      startPlayer,
      [],
      new Set([startPlayer]),
      new Set()
    );

    return chains;
  };

  /*
   * ---------------------------------------------------------
   * CHAIN SCORING
   * ---------------------------------------------------------
   */

  const scoreTradeChain = (chain) => {
    if (!chain.length) {
      return 0;
    }

    let score = 0;

    let strategicCards = 0;
    let duplicateCards = 0;

    chain.forEach((trade) => {
      if (trade.type === "duplicate") {
        duplicateCards++;
        score += 100;
      } else {
        strategicCards++;
        score += 60;
      }
    });

    /*
     * Strong bonus because the user's
     * actual Need is satisfied.
     */
    score += 200;

    /*
     * Short chains are easier to coordinate.
     */
    score -= chain.length * 15;

    /*
     * Strategic chains are slightly riskier.
     */
    score -= strategicCards * 5;

    /*
     * More players = more coordination.
     */
    if (chain.length === 2) {
      score += 40;
    }

    if (chain.length === 3) {
      score += 20;
    }

    if (chain.length >= 4) {
      score -= 20;
    }

    return Math.max(
      0,
      Math.round(score)
    );
  };

  /*
   * ---------------------------------------------------------
   * REMOVE DUPLICATE CHAINS
   * ---------------------------------------------------------
   */

  const normalizeChain = (chain) => {
    return chain
      .map(
        (trade) =>
          `${trade.from}:${trade.cardId}:${trade.to}`
      )
      .join("|");
  };

  /*
   * ---------------------------------------------------------
   * STRATEGIC CARD ANALYSIS
   *
   * Finds cards that are currently neutral but
   * could unlock useful trades.
   * ---------------------------------------------------------
   */

  const calculateStrategicCards = () => {
    if (!selectedPlayer) {
      return [];
    }

    const opportunities = [];

    const neutralCards =
      cardsData.filter(
        (card) =>
          !myNeeds.includes(card.id) &&
          !myDuplicates.includes(card.id)
      );

    neutralCards.forEach((card) => {
      let peopleWhoNeed = 0;
      let potentialChains = 0;

      Object.entries(tradesDb).forEach(
        ([tag, player]) => {
          if (
            tag === selectedPlayer
          ) {
            return;
          }

          if (
            player.needs?.includes(
              card.id
            )
          ) {
            peopleWhoNeed++;
          }
        }
      );

      /*
       * Temporarily treat the card as a duplicate
       * and inspect possible opportunities.
       *
       * We don't mutate the database.
       */
      if (peopleWhoNeed === 0) {
        return;
      }

      Object.entries(tradesDb).forEach(
        ([tag, player]) => {
          if (
            tag === selectedPlayer
          ) {
            return;
          }

          if (
            !player.needs?.includes(
              card.id
            )
          ) {
            return;
          }

          const theirDuplicates =
            player.duplicates || [];

          theirDuplicates.forEach(
            (theirCard) => {
              if (
                myNeeds.includes(
                  theirCard
                )
              ) {
                potentialChains++;
              }
            }
          );
        }
      );

      const score =
        peopleWhoNeed * 25 +
        potentialChains * 35;

      opportunities.push({
        cardId: card.id,
        cardName: card.name,
        category: card.category,
        peopleWhoNeed,
        potentialChains,
        score,
      });
    });

    return opportunities
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(0, 10);
  };

  /*
   * ---------------------------------------------------------
   * COMPUTED TRADE DATA
   * ---------------------------------------------------------
   */

  const directMatches =
    useMemo(
      () => calculateDirectMatches(),
      [
        selectedPlayer,
        tradesDb,
        myNeeds,
        myDuplicates,
      ]
    );

  const tradeChains = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    const chains =
      findTradeChains(
        selectedPlayer,
        tradeDepth
      );

    const unique = new Map();

    chains.forEach((chain) => {
      const key =
        normalizeChain(chain);

      if (!unique.has(key)) {
        unique.set(key, chain);
      }
    });

    return Array.from(
      unique.values()
    )
      .map((chain) => ({
        chain,
        score:
          scoreTradeChain(chain),
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(
        0,
        MAX_CHAINS_TO_SHOW
      );
  }, [
    selectedPlayer,
    tradesDb,
    myNeeds,
    myDuplicates,
    tradeDepth,
  ]);

  const strategicCards =
    useMemo(
      () =>
        calculateStrategicCards(),
      [
        selectedPlayer,
        tradesDb,
        myNeeds,
        myDuplicates,
      ]
    );

  /*
   * ---------------------------------------------------------
   * COMPLETE DIRECT TRADE
   * ---------------------------------------------------------
   */

  const handleCompleteTrade = async (
    otherTag,
    myCardId,
    theirCardId
  ) => {
    const otherData =
      tradesDb[otherTag];

    if (!otherData) {
      return;
    }

    const confirmed = window.confirm(
      `Complete trade?\n\n` +
        `You give: ${getCardName(
          myCardId
        )}\n` +
        `You receive: ${getCardName(
          theirCardId
        )}\n\n` +
        `This will update both inventories.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const myNewNeeds =
        myNeeds.filter(
          (id) =>
            id !== theirCardId
        );

      const myNewDuplicates =
        myDuplicates.filter(
          (id) =>
            id !== myCardId
        );

      const theirNewNeeds =
        (otherData.needs || []).filter(
          (id) =>
            id !== myCardId
        );

      const theirNewDuplicates =
        (
          otherData.duplicates ||
          []
        ).filter(
          (id) =>
            id !== theirCardId
        );

      const me =
        clanMembers.find(
          (m) =>
            m.tag === selectedPlayer
        );

      /*
       * NOTE:
       *
       * This uses the same two-request structure
       * as your original implementation.
       *
       * For production, replace this with ONE
       * backend transaction.
       */

      const firstResponse =
        await fetch(
          "/api/cards",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              playerTag:
                selectedPlayer,
              playerName:
                me?.name ||
                tradesDb[
                  selectedPlayer
                ]?.name ||
                selectedPlayer,
              needs:
                myNewNeeds,
              duplicates:
                myNewDuplicates,
            }),
          }
        );

      if (!firstResponse.ok) {
        throw new Error(
          "Failed to update your inventory"
        );
      }

      const secondResponse =
        await fetch(
          "/api/cards",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              playerTag:
                otherTag,
              playerName:
                otherData.name ||
                getPlayerName(
                  otherTag
                ),
              needs:
                theirNewNeeds,
              duplicates:
                theirNewDuplicates,
            }),
          }
        );

      if (!secondResponse.ok) {
        throw new Error(
          "Failed to update other inventory"
        );
      }

      await fetchTrades();

      alert(
        "Trade completed successfully!"
      );
    } catch (error) {
      console.error(
        "Trade failed:",
        error
      );

      alert(
        "Trade failed. Please refresh and verify inventories."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CHAIN EXPLANATION
   * ---------------------------------------------------------
   */

  const getChainExplanation = (
    chain
  ) => {
    if (!chain?.length) {
      return "";
    }

    const finalTrade =
      chain[chain.length - 1];

    const receivedCard =
      finalTrade.cardName;

    const strategicCount =
      chain.filter(
        (trade) =>
          trade.type ===
          "strategic"
      ).length;

    if (strategicCount === 0) {
      return `Everyone has a card the next player needs. This is a clean ${chain.length}-player exchange.`;
    }

    return (
      `This chain uses ${strategicCount} ` +
      `card${
        strategicCount > 1
          ? "s"
          : ""
      } that ${
        strategicCount > 1
          ? "aren't"
          : "isn't"
      } currently marked as duplicates. ` +
      `Following the chain ultimately gets you ` +
      `${receivedCard}, which you need.`
    );
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="animate-fade-in">
      {/* HEADER */}

      <div
        className="glass-panel text-center"
        style={{
          marginBottom: "2rem",
        }}
      >
        <h1
          className="title-glow"
          style={{
            fontSize: "2.5rem",
            marginBottom: "1rem",
          }}
        >
          Clash of Cards Trading
        </h1>

        <p
          className="text-muted"
          style={{
            marginBottom: "1.5rem",
          }}
        >
          Find direct trades and strategic
          multi-player card chains.
        </p>

        <select
          value={selectedPlayer}
          onChange={(e) =>
            setSelectedPlayer(
              e.target.value
            )
          }
          style={{
            padding: "0.8rem 1.5rem",
            borderRadius: "8px",
            background:
              "rgba(0,0,0,0.3)",
            color: "white",
            border:
              "1px solid var(--border-glass)",
            fontSize: "1.1rem",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <option value="">
            -- Select Your Player --
          </option>

          {clanMembers.map(
            (member) => (
              <option
                key={member.tag}
                value={member.tag}
              >
                {member.name} (
                {member.tag})
              </option>
            )
          )}
        </select>
      </div>

      {selectedPlayer && (
        <>
          {/* TABS */}

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "2rem",
              justifyContent:
                "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-primary"
              onClick={() =>
                setActiveTab(
                  "inventory"
                )
              }
              style={{
                opacity:
                  activeTab ===
                  "inventory"
                    ? 1
                    : 0.5,
              }}
            >
              My Inventory
            </button>

            <button
              className="btn-primary"
              onClick={() =>
                setActiveTab(
                  "matches"
                )
              }
              style={{
                opacity:
                  activeTab ===
                  "matches"
                    ? 1
                    : 0.5,
                background:
                  "linear-gradient(135deg, var(--coc-dark-elixir), #009977)",
              }}
            >
              🔥 Find Trades
            </button>

            <button
              className="btn-primary"
              onClick={() =>
                setActiveTab(
                  "strategic"
                )
              }
              style={{
                opacity:
                  activeTab ===
                  "strategic"
                    ? 1
                    : 0.5,
                background:
                  "linear-gradient(135deg, #6c5ce7, #a55eea)",
              }}
            >
              🧠 Strategic Cards
            </button>
          </div>

          {/* =================================================
              INVENTORY
          ================================================= */}

          {activeTab ===
            "inventory" && (
            <div className="glass-panel">
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "1.5rem",
                  gap: "1rem",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <h2 className="text-gold">
                    Card Inventory
                  </h2>

                  <p className="text-muted">
                    Mark cards you need or
                    cards you are willing to
                    trade.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems:
                      "center",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <select
                    value={
                      filterCategory
                    }
                    onChange={(e) =>
                      setFilterCategory(
                        e.target.value
                      )
                    }
                    style={{
                      padding:
                        "0.5rem 1rem",
                      borderRadius:
                        "8px",
                      background:
                        "rgba(0,0,0,0.3)",
                      color:
                        "white",
                      border:
                        "1px solid var(--border-glass)",
                    }}
                  >
                    <option value="All">
                      All Troops
                    </option>

                    {CATEGORIES.map(
                      (cat) => (
                        <option
                          key={cat}
                          value={
                            cat
                          }
                        >
                          {cat}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    className="btn-primary"
                    onClick={
                      handleSave
                    }
                    disabled={
                      isSaving
                    }
                  >
                    {isSaving
                      ? "Saving..."
                      : "Save Inventory"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                {cardsData
                  .filter(
                    (card) =>
                      filterCategory ===
                        "All" ||
                      card.category ===
                        filterCategory
                  )
                  .map((card) => {
                    const isNeed =
                      myNeeds.includes(
                        card.id
                      );

                    const isDup =
                      myDuplicates.includes(
                        card.id
                      );

                    return (
                      <div
                        key={card.id}
                        style={{
                          background:
                            "rgba(0,0,0,0.2)",
                          padding:
                            "1rem",
                          borderRadius:
                            "8px",
                          borderLeft:
                            `4px solid ${
                              isNeed
                                ? "var(--coc-elixir)"
                                : isDup
                                ? "var(--coc-dark-elixir)"
                                : "var(--border-glass)"
                            }`,
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "0.8rem",
                            color:
                              "var(--text-muted)",
                            marginBottom:
                              "0.2rem",
                          }}
                        >
                          {
                            card.category
                          }
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "0.8rem",
                            marginBottom:
                              "0.8rem",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "40px",
                              height:
                                "40px",
                              borderRadius:
                                "8px",
                              background:
                                "rgba(0,0,0,0.5)",
                              display:
                                "flex",
                              justifyContent:
                                "center",
                              alignItems:
                                "center",
                              overflow:
                                "hidden",
                            }}
                          >
                            <img
                              src={`/troops/${card.image}`}
                              alt={
                                card.name
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                              }}
                              onError={(
                                e
                              ) => {
                                e.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          </div>

                          <div
                            style={{
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              card.name
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: "0.5rem",
                          }}
                        >
                          <button
                            onClick={() =>
                              toggleNeed(
                                card.id
                              )
                            }
                            style={{
                              flex: 1,
                              padding:
                                "0.4rem",
                              borderRadius:
                                "4px",
                              border:
                                "none",
                              cursor:
                                "pointer",
                              background:
                                isNeed
                                  ? "var(--coc-elixir)"
                                  : "rgba(255,255,255,0.1)",
                              color:
                                isNeed
                                  ? "white"
                                  : "var(--text-secondary)",
                              fontSize:
                                "0.8rem",
                              fontWeight:
                                "bold",
                            }}
                          >
                            Need
                          </button>

                          <button
                            onClick={() =>
                              toggleDuplicate(
                                card.id
                              )
                            }
                            style={{
                              flex: 1,
                              padding:
                                "0.4rem",
                              borderRadius:
                                "4px",
                              border:
                                "none",
                              cursor:
                                "pointer",
                              background:
                                isDup
                                  ? "var(--coc-dark-elixir)"
                                  : "rgba(255,255,255,0.1)",
                              color:
                                isDup
                                  ? "#000"
                                  : "var(--text-secondary)",
                              fontSize:
                                "0.8rem",
                              fontWeight:
                                "bold",
                            }}
                          >
                            Duplicate
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =================================================
              MATCHES
          ================================================= */}

          {activeTab ===
            "matches" && (
            <div>
              {/* MATCH CONTROLS */}

              <div
                className="glass-panel"
                style={{
                  marginBottom:
                    "1.5rem",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "1rem",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <h2 className="text-dark-elixir">
                      🔥 Advanced Trade
                      Matchmaker
                    </h2>

                    <p className="text-muted">
                      We search beyond direct
                      duplicates and discover
                      multi-player trade chains.
                    </p>
                  </div>

                  <div>
                    <label
                      className="text-muted"
                      style={{
                        display:
                          "block",
                        fontSize:
                          "0.8rem",
                        marginBottom:
                          "0.3rem",
                      }}
                    >
                      Maximum players
                    </label>

                    <select
                      value={
                        tradeDepth
                      }
                      onChange={(e) =>
                        setTradeDepth(
                          Number(
                            e.target
                              .value
                          )
                        )
                      }
                      style={{
                        padding:
                          "0.5rem 1rem",
                        borderRadius:
                          "8px",
                        background:
                          "rgba(0,0,0,0.3)",
                        color:
                          "white",
                        border:
                          "1px solid var(--border-glass)",
                      }}
                    >
                      <option value={2}>
                        2 Players
                      </option>
                      <option value={3}>
                        3 Players
                      </option>
                      <option value={4}>
                        4 Players
                      </option>
                      <option value={5}>
                        5 Players
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DIRECT TRADES */}

              <div
                className="glass-panel"
                style={{
                  marginBottom:
                    "1.5rem",
                }}
              >
                <h2
                  className="text-gold"
                  style={{
                    marginBottom:
                      "1rem",
                  }}
                >
                  ⚡ Direct Trades
                </h2>

                {directMatches.length ===
                0 ? (
                  <p className="text-muted">
                    No direct trades found.
                  </p>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gap: "1rem",
                    }}
                  >
                    {directMatches.map(
                      (match) => (
                        <div
                          key={
                            match.playerTag
                          }
                          style={{
                            background:
                              "rgba(0,0,0,0.2)",
                            padding:
                              "1.25rem",
                            borderRadius:
                              "10px",
                            border:
                              match.isPerfect
                                ? "1px solid var(--coc-gold)"
                                : "1px solid var(--border-glass)",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              marginBottom:
                                "1rem",
                              flexWrap:
                                "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            <h3>
                              {match.playerName}
                            </h3>

                            {match.isPerfect && (
                              <span
                                style={{
                                  background:
                                    "var(--coc-gold)",
                                  color:
                                    "#000",
                                  padding:
                                    "0.3rem 0.7rem",
                                  borderRadius:
                                    "5px",
                                  fontWeight:
                                    "bold",
                                  fontSize:
                                    "0.75rem",
                                }}
                              >
                                PERFECT SWAP
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: "1rem",
                            }}
                          >
                            <div
                              style={{
                                background:
                                  "rgba(0,255,204,0.08)",
                                padding:
                                  "1rem",
                                borderRadius:
                                  "8px",
                              }}
                            >
                              <h4 className="text-dark-elixir">
                                You Give
                              </h4>

                              {match.iCanGive
                                .length >
                              0 ? (
                                match.iCanGive.map(
                                  (
                                    cardId
                                  ) => (
                                    <div
                                      key={
                                        cardId
                                      }
                                      style={{
                                        display:
                                          "flex",
                                        justifyContent:
                                          "space-between",
                                        alignItems:
                                          "center",
                                        padding:
                                          "0.4rem 0",
                                      }}
                                    >
                                      <span>
                                        {getCardName(
                                          cardId
                                        )}
                                      </span>

                                      {match.theyCanGive
                                        .length >
                                        0 && (
                                        <span>
                                          →
                                        </span>
                                      )}
                                    </div>
                                  )
                                )
                              ) : (
                                <span className="text-muted">
                                  Nothing
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                background:
                                  "rgba(211,61,235,0.08)",
                                padding:
                                  "1rem",
                                borderRadius:
                                  "8px",
                              }}
                            >
                              <h4 className="text-elixir">
                                You Receive
                              </h4>

                              {match.theyCanGive
                                .length >
                              0 ? (
                                match.theyCanGive.map(
                                  (
                                    cardId
                                  ) => (
                                    <div
                                      key={
                                        cardId
                                      }
                                      style={{
                                        padding:
                                          "0.4rem 0",
                                      }}
                                    >
                                      {
                                        getCardName(
                                          cardId
                                        )
                                      }
                                    </div>
                                  )
                                )
                              ) : (
                                <span className="text-muted">
                                  Nothing
                                </span>
                              )}
                            </div>
                          </div>

                          {match.isPerfect && (
                            <div
                              style={{
                                marginTop:
                                  "1rem",
                                display:
                                  "flex",
                                gap: "0.5rem",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              {match.iCanGive.map(
                                (
                                  myCard
                                ) =>
                                  match.theyCanGive.map(
                                    (
                                      theirCard
                                    ) => (
                                      <button
                                        key={`${myCard}-${theirCard}`}
                                        onClick={() =>
                                          handleCompleteTrade(
                                            match.playerTag,
                                            myCard,
                                            theirCard
                                          )
                                        }
                                        style={{
                                          padding:
                                            "0.5rem 1rem",
                                          background:
                                            "var(--coc-gold)",
                                          color:
                                            "#000",
                                          border:
                                            "none",
                                          borderRadius:
                                            "6px",
                                          fontWeight:
                                            "bold",
                                          cursor:
                                            "pointer",
                                        }}
                                      >
                                        Trade{" "}
                                        {getCardName(
                                          myCard
                                        )}{" "}
                                        ↔{" "}
                                        {getCardName(
                                          theirCard
                                        )}
                                      </button>
                                    )
                                  )
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* CHAIN TRADES */}

              <div className="glass-panel">
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginBottom:
                      "1.5rem",
                  }}
                >
                  <div>
                    <h2
                      className="text-gold"
                    >
                      🔗 Strategic Trade
                      Chains
                    </h2>

                    <p className="text-muted">
                      These trades use other
                      players as intermediaries
                      to unlock cards you need.
                    </p>
                  </div>

                  <div
                    style={{
                      fontSize:
                        "0.8rem",
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    {
                      tradeChains.length
                    } opportunities
                  </div>
                </div>

                {tradeChains.length ===
                0 ? (
                  <div
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "2rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "2rem",
                        marginBottom:
                          "0.5rem",
                      }}
                    >
                      🔍
                    </div>

                    <p className="text-muted">
                      No strategic trade
                      chains found.
                    </p>

                    <p
                      className="text-muted"
                      style={{
                        fontSize:
                          "0.8rem",
                        marginTop:
                          "0.5rem",
                      }}
                    >
                      Ask clan members to
                      update their inventory
                      to discover more
                      opportunities.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gap: "1rem",
                    }}
                  >
                    {tradeChains.map(
                      (
                        result,
                        index
                      ) => {
                        const {
                          chain,
                          score,
                        } = result;

                        const isExpanded =
                          expandedChain ===
                          index;

                        return (
                          <div
                            key={
                              normalizeChain(
                                chain
                              )
                            }
                            style={{
                              background:
                                "rgba(0,0,0,0.2)",
                              padding:
                                "1.25rem",
                              borderRadius:
                                "10px",
                              border:
                                index ===
                                0
                                  ? "1px solid var(--coc-gold)"
                                  : "1px solid var(--border-glass)",
                            }}
                          >
                            {/* CHAIN HEADER */}

                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "center",
                                gap: "1rem",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize:
                                        "0.75rem",
                                      padding:
                                        "0.2rem 0.5rem",
                                      borderRadius:
                                        "4px",
                                      background:
                                        index ===
                                        0
                                          ? "var(--coc-gold)"
                                          : "rgba(255,255,255,0.1)",
                                      color:
                                        index ===
                                        0
                                          ? "#000"
                                          : "white",
                                      fontWeight:
                                        "bold",
                                    }}
                                  >
                                    #
                                    {index +
                                      1}
                                  </span>

                                  <h3>
                                    {
                                      chain.length
                                    }
                                    -Player
                                    Chain
                                  </h3>
                                </div>

                                <p
                                  className="text-muted"
                                  style={{
                                    marginTop:
                                      "0.3rem",
                                    fontSize:
                                      "0.85rem",
                                  }}
                                >
                                  {
                                    getChainExplanation(
                                      chain
                                    )
                                  }
                                </p>
                              </div>

                              <div
                                style={{
                                  textAlign:
                                    "right",
                                }}
                              >
                                <div
                                  style={{
                                    color:
                                      "var(--coc-gold)",
                                    fontSize:
                                      "1.2rem",
                                    fontWeight:
                                      "bold",
                                  }}
                                >
                                  {score}
                                </div>

                                <div
                                  className="text-muted"
                                  style={{
                                    fontSize:
                                      "0.7rem",
                                  }}
                                >
                                  Trade Score
                                </div>
                              </div>
                            </div>

                            {/* VISUAL CHAIN */}

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "0.5rem",
                                overflowX:
                                  "auto",
                                padding:
                                  "1rem 0",
                              }}
                            >
                              {chain.map(
                                (
                                  trade,
                                  tradeIndex
                                ) => (
                                  <div
                                    key={`${trade.from}-${trade.cardId}-${trade.to}`}
                                    style={{
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      gap: "0.5rem",
                                      flexShrink:
                                        0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding:
                                          "0.7rem",
                                        borderRadius:
                                          "8px",
                                        background:
                                          "rgba(255,255,255,0.05)",
                                        border:
                                          trade.type ===
                                          "strategic"
                                            ? "1px solid #a55eea"
                                            : "1px solid var(--coc-dark-elixir)",
                                        minWidth:
                                          "130px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize:
                                            "0.75rem",
                                          color:
                                            "var(--text-muted)",
                                        }}
                                      >
                                        {
                                          getPlayerName(
                                            trade.from
                                          )
                                        }
                                      </div>

                                      <div
                                        style={{
                                          fontWeight:
                                            "bold",
                                          margin:
                                            "0.2rem 0",
                                        }}
                                      >
                                        ↓{" "}
                                        {
                                          trade.cardName
                                        }
                                      </div>

                                      <div
                                        style={{
                                          fontSize:
                                            "0.7rem",
                                          color:
                                            trade.type ===
                                            "strategic"
                                              ? "#a55eea"
                                              : "var(--coc-dark-elixir)",
                                        }}
                                      >
                                        {trade.type ===
                                        "strategic"
                                          ? "Strategic card"
                                          : "Duplicate"}
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        fontSize:
                                          "1.2rem",
                                        color:
                                          "var(--text-muted)",
                                      }}
                                    >
                                      →
                                    </span>

                                    {tradeIndex ===
                                      chain.length -
                                        1 && (
                                      <div
                                        style={{
                                          padding:
                                            "0.7rem",
                                          borderRadius:
                                            "8px",
                                          background:
                                            "rgba(255,193,7,0.1)",
                                          border:
                                            "1px solid var(--coc-gold)",
                                          minWidth:
                                            "130px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize:
                                              "0.75rem",
                                            color:
                                              "var(--text-muted)",
                                          }}
                                        >
                                          You
                                        </div>

                                        <div
                                          style={{
                                            fontWeight:
                                              "bold",
                                            marginTop:
                                              "0.2rem",
                                            color:
                                              "var(--coc-gold)",
                                          }}
                                        >
                                          Receive ↓
                                        </div>

                                        <div
                                          style={{
                                            fontWeight:
                                              "bold",
                                          }}
                                        >
                                          {
                                            trade.cardName
                                          }
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>

                            {/* DETAILS */}

                            <button
                              onClick={() =>
                                setExpandedChain(
                                  isExpanded
                                    ? null
                                    : index
                                )
                              }
                              style={{
                                background:
                                  "rgba(255,255,255,0.08)",
                                color:
                                  "white",
                                border:
                                  "none",
                                borderRadius:
                                  "6px",
                                padding:
                                  "0.5rem 0.8rem",
                                cursor:
                                  "pointer",
                              }}
                            >
                              {isExpanded
                                ? "Hide Details"
                                : "Why this trade?"}
                            </button>

                            {isExpanded && (
                              <div
                                style={{
                                  marginTop:
                                    "1rem",
                                  padding:
                                    "1rem",
                                  background:
                                    "rgba(0,0,0,0.25)",
                                  borderRadius:
                                    "8px",
                                }}
                              >
                                <h4
                                  style={{
                                    marginBottom:
                                      "0.75rem",
                                  }}
                                >
                                  🧠 Trade Logic
                                </h4>

                                {chain.map(
                                  (
                                    trade,
                                    i
                                  ) => (
                                    <div
                                      key={`${trade.from}-${trade.cardId}-${trade.to}-detail`}
                                      style={{
                                        padding:
                                          "0.6rem 0",
                                        borderBottom:
                                          i <
                                          chain.length -
                                            1
                                            ? "1px solid var(--border-glass)"
                                            : "none",
                                      }}
                                    >
                                      <strong>
                                        Step{" "}
                                        {i +
                                          1}
                                        :
                                      </strong>{" "}
                                      {
                                        getPlayerName(
                                          trade.from
                                        )
                                      }{" "}
                                      gives{" "}
                                      <strong>
                                        {
                                          trade.cardName
                                        }
                                      </strong>{" "}
                                      to{" "}
                                      {
                                        getPlayerName(
                                          trade.to
                                        )
                                      }

                                      {trade.type ===
                                        "strategic" && (
                                        <span
                                          style={{
                                            marginLeft:
                                              "0.5rem",
                                            color:
                                              "#a55eea",
                                            fontSize:
                                              "0.75rem",
                                          }}
                                        >
                                          Strategic
                                          card
                                        </span>
                                      )}
                                    </div>
                                  )
                                )}

                                <div
                                  style={{
                                    marginTop:
                                      "1rem",
                                    color:
                                      "var(--coc-gold)",
                                    fontWeight:
                                      "bold",
                                  }}
                                >
                                  🎯 Result: You
                                  ultimately receive{" "}
                                  {
                                    chain[
                                      chain.length -
                                        1
                                    ].cardName
                                  }
                                </div>

                                <p
                                  className="text-muted"
                                  style={{
                                    fontSize:
                                      "0.8rem",
                                    marginTop:
                                      "0.5rem",
                                  }}
                                >
                                  Coordinate all
                                  players in Clan
                                  Chat before
                                  executing this
                                  chain.
                                </p>
                              </div>
                            )}

                            {/* ACTION */}

                            <div
                              style={{
                                marginTop:
                                  "1rem",
                                display:
                                  "flex",
                                justifyContent:
                                  "flex-end",
                              }}
                            >
                              <button
                                onClick={() => {
                                  const text =
                                    chain
                                      .map(
                                        (
                                          trade
                                        ) =>
                                          `${getPlayerName(
                                            trade.from
                                          )} gives ${trade.cardName} to ${getPlayerName(
                                            trade.to
                                          )}`
                                      )
                                      .join(
                                        "\n"
                                      );

                                  navigator.clipboard?.writeText(
                                    `🔥 Card Trade Chain\n\n${text}\n\nYou receive: ${chain[chain.length - 1].cardName}`
                                  );

                                  alert(
                                    "Trade chain copied to clipboard!"
                                  );
                                }}
                                style={{
                                  padding:
                                    "0.5rem 1rem",
                                  background:
                                    "rgba(255,255,255,0.08)",
                                  color:
                                    "white",
                                  border:
                                    "none",
                                  borderRadius:
                                    "6px",
                                  cursor:
                                    "pointer",
                                }}
                              >
                                📋 Copy to Clan Chat
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================
              STRATEGIC CARDS
          ================================================= */}

          {activeTab ===
            "strategic" && (
            <div className="glass-panel">
              <div
                style={{
                  marginBottom:
                    "1.5rem",
                }}
              >
                <h2
                  style={{
                    color:
                      "#a55eea",
                  }}
                >
                  🧠 Strategic Cards
                </h2>

                <p className="text-muted">
                  These cards aren't marked as
                  duplicates, but giving them away
                  could unlock useful trades.
                </p>
              </div>

              {strategicCards.length ===
              0 ? (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "2rem",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "2rem",
                    }}
                  >
                    💤
                  </div>

                  <p className="text-muted">
                    No strategic card
                    opportunities right now.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {strategicCards.map(
                    (card) => (
                      <div
                        key={
                          card.cardId
                        }
                        style={{
                          background:
                            "rgba(165,94,234,0.08)",
                          border:
                            "1px solid rgba(165,94,234,0.4)",
                          borderRadius:
                            "10px",
                          padding:
                            "1.25rem",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            gap: "0.8rem",
                            alignItems:
                              "center",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "50px",
                              height:
                                "50px",
                              borderRadius:
                                "8px",
                              overflow:
                                "hidden",
                              background:
                                "rgba(0,0,0,0.4)",
                            }}
                          >
                            <img
                              src={`/troops/${getCardImage(
                                card.cardId
                              )}`}
                              alt={
                                card.cardName
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                              }}
                            />
                          </div>

                          <div>
                            <h3>
                              {
                                card.cardName
                              }
                            </h3>

                            <span
                              className="text-muted"
                              style={{
                                fontSize:
                                  "0.75rem",
                              }}
                            >
                              {
                                card.category
                              }
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "1fr 1fr",
                            gap: "0.5rem",
                            margin:
                              "1rem 0",
                          }}
                        >
                          <div
                            style={{
                              background:
                                "rgba(0,0,0,0.2)",
                              padding:
                                "0.7rem",
                              borderRadius:
                                "6px",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "1.3rem",
                                fontWeight:
                                  "bold",
                                color:
                                  "var(--coc-gold)",
                              }}
                            >
                              {
                                card.peopleWhoNeed
                              }
                            </div>

                            <div
                              className="text-muted"
                              style={{
                                fontSize:
                                  "0.7rem",
                              }}
                            >
                              Players need it
                            </div>
                          </div>

                          <div
                            style={{
                              background:
                                "rgba(0,0,0,0.2)",
                              padding:
                                "0.7rem",
                              borderRadius:
                                "6px",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "1.3rem",
                                fontWeight:
                                  "bold",
                                color:
                                  "#a55eea",
                              }}
                            >
                              {
                                card.potentialChains
                              }
                            </div>

                            <div
                              className="text-muted"
                              style={{
                                fontSize:
                                  "0.7rem",
                              }}
                            >
                              Chain opportunities
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign:
                              "center",
                            padding:
                              "0.5rem",
                            background:
                              "rgba(165,94,234,0.15)",
                            borderRadius:
                              "6px",
                            color:
                              "#a55eea",
                            fontWeight:
                              "bold",
                          }}
                        >
                          Trade Potential:{" "}
                          {
                            card.score
                          }
                        </div>

                        <p
                          className="text-muted"
                          style={{
                            fontSize:
                              "0.75rem",
                            marginTop:
                              "0.8rem",
                          }}
                        >
                          You don't currently
                          need this card or have
                          it marked as duplicate.
                          However, other clan
                          members need it and it
                          may unlock a trade chain.
                        </p>
                      </div>
                    )
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
