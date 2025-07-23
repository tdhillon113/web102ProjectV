import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useParams,
} from "react-router-dom";
import { BarChart } from "@mui/x-charts/BarChart";
import "./App.css";

// CardDetail component moved from separate file
function CardDetail() {
  const { cardId } = useParams();
  const [card, setCard] = useState(null);

  useEffect(() => {
    const fetchCardDetail = async () => {
      try {
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards/${cardId}`,
          {
            headers: {
              "X-Api-Key": "e3054edd-1ebe-44c9-a023-f2f425a2bbb4",
            },
          }
        );
        const { data } = await response.json();

        // Destructure to avoid repetitive .data calls
        const { id, name, set, types, hp, images, tcgplayer, rarity, artist } =
          data;

        // Extract price from tcgplayer data more efficiently
        const getCardPrice = () => {
          if (!tcgplayer?.prices) return "N/A";
          const { holofoil, normal, reverseHolofoil } = tcgplayer.prices;
          return (
            holofoil?.market ||
            normal?.market ||
            reverseHolofoil?.market ||
            "N/A"
          );
        };

        const cardDetail = {
          id,
          name,
          set: set?.name || "Unknown Set",
          types: types || ["Colorless"],
          hp: hp || "N/A",
          image: images?.large || images?.small || "",
          price: getCardPrice(),
          rarity: rarity || "Common",
          artist: artist || "Unknown",
        };

        setCard(cardDetail);
      } catch (error) {
        console.error("Error fetching card detail:", error);
      }
    };

    if (cardId) {
      fetchCardDetail();
    }
  }, [cardId]);

  if (!card) return null;

  return (
    <div className="detailcontainer">
      <main className="detailcontent">
        <Link to="/" className="backbutton">
          ← Back to Dashboard
        </Link>

        <header className="detailheader">
          <h1>{card.name}</h1>
        </header>

        <div className="detailgrid">
          <section className="detailinfosection">
            <h3>Card Information</h3>
            <p>
              <strong>HP:</strong> {card.hp}
            </p>
            <p>
              <strong>Rarity:</strong> {card.rarity}
            </p>
            <p>
              <strong>Set:</strong> {card.set}
            </p>
            <p>
              <strong>Price:</strong> ${card.price}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounceSearch, setDebounceSearch] = useState("");
  const cardsPerPage = 20; // Increased for better initial load

  // Faster debounce for better UX
  useEffect(() => {
    const timer = setTimeout(() => setDebounceSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load initial cards on mount
  useEffect(() => {
    const fetchInitialCards = async () => {
      try {
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?pageSize=${cardsPerPage}&q=supertype:Pokemon`,
          {
            headers: {
              "X-Api-Key": "e3054edd-1ebe-44c9-a023-f2f425a2bbb4",
            },
          }
        );
        const data = await response.json();

        const cardDetails = data.data.map((card) => ({
          id: card.id,
          name: card.name,
          set: card.set?.name || "Unknown Set",
          types: card.types || ["Colorless"],
          hp: card.hp || "N/A",
          image: card.images?.small || "",
          price:
            card.tcgplayer?.prices?.holofoil?.market ||
            card.tcgplayer?.prices?.normal?.market ||
            card.tcgplayer?.prices?.reverseHolofoil?.market ||
            "none",
          description: card.flavorText || card.rules?.[0] || "none",
          supertype: card.supertype || "Pokemon",
        }));

        setCards(cardDetails);
      } catch (error) {
        console.error("Error fetching cards:", error);
      }
    };

    fetchInitialCards();
  }, []); // Only run once on mount

  // Search functionality
  useEffect(() => {
    if (!debounceSearch) return; // Don't search if empty
    
    const searchCards = async () => {
      try {
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?pageSize=${cardsPerPage}&q=supertype:Pokemon AND name:*${debounceSearch}*`,
          {
            headers: {
              "X-Api-Key": "e3054edd-1ebe-44c9-a023-f2f425a2bbb4",
            },
          }
        );
        const data = await response.json();

        const cardDetails = data.data.map((card) => ({
          id: card.id,
          name: card.name,
          set: card.set?.name || "Unknown Set",
          types: card.types || ["Colorless"],
          hp: card.hp || "N/A",
          image: card.images?.small || "",
          price:
            card.tcgplayer?.prices?.holofoil?.market ||
            card.tcgplayer?.prices?.normal?.market ||
            card.tcgplayer?.prices?.reverseHolofoil?.market ||
            "none",
          description: card.flavorText || card.rules?.[0] || "none",
          supertype: card.supertype || "Pokemon",
        }));

        setCards(cardDetails);
      } catch (error) {
        console.error("Error searching cards:", error);
      }
    };

    searchCards();
  }, [debounceSearch]);

  //   displayed cards stats
  const stats = useMemo(() => {
    if (cards.length === 0) {
      return { count: 0, highestPrice: 0, lowestPrice: 0 };
    }

    const prices = cards
      .map((card) => parseFloat(card.price))
      .filter((price) => !isNaN(price) && price > 0);

    return {
      count: cards.length,
      highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
    };
  }, [cards]);

  //  chart data - memoized for better performance
  const chartData = useMemo(() => {
    if (!cards?.length) return { priceData: [], setData: [] };

    const priceRanges = {
      "Under $1": 0,
      "$1-$5": 0,
      "$5-$10": 0,
      "$10-$20": 0,
      "$20-$50": 0,
      "$50+": 0,
    };
    const setCounts = {};

    cards.forEach((card) => {
      //price ranges
      const price = parseFloat(card.price);
      if (!isNaN(price) && price > 0) {
        if (price < 1) priceRanges["Under $1"]++;
        else if (price < 5) priceRanges["$1-$5"]++;
        else if (price < 10) priceRanges["$5-$10"]++;
        else if (price < 20) priceRanges["$10-$20"]++;
        else if (price < 50) priceRanges["$20-$50"]++;
        else priceRanges["$50+"]++;
      }

      //sets
      setCounts[card.set] = (setCounts[card.set] || 0) + 1;
    });

    return {
      priceData: Object.entries(priceRanges).map(([range, count]) => ({
        range,
        count,
      })),
      setData: Object.entries(setCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([set, count]) => ({
          set: set.length > 15 ? set.substring(0, 15) + "..." : set,
          count,
        })),
    };
  }, [cards]);

  // Optimized search handler
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <main className="app">
      <header className="header">
        <h1> Bootleg Pokemon TCG </h1>
        <p>Explore The World of Pokemon Trading </p>
      </header>

      <section className="stats">
        <article className="statbox">
          <h3>Cards Found</h3>
          <p>{stats.count}</p>
        </article>
        <article className="statbox">
          <h3>Highest Price</h3>
          <p>${stats.highestPrice.toFixed(2)}</p>
        </article>
        <article className="statbox">
          <h3>Lowest Price</h3>
          <p>${stats.lowestPrice.toFixed(2)}</p>
        </article>
      </section>

      <section className="chartscontainer">
        {cards && cards.length > 0 ? (
          <section className="chartsgrid">
            <article className="chartcard">
              <h3>Price Range Distribution</h3>
              <figure className="chartwrapper">
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      dataKey: "range",
                      tickPlacement: "middle",
                      tickLabelPlacement: "middle",
                    },
                  ]}
                  series={[
                    {
                      dataKey: "count",
                      label: "Number of Cards",
                      color: "#c7a008",
                    },
                  ]}
                  dataset={chartData.priceData}
                  width={400}
                  height={300}
                  margin={{ top: 40, bottom: 60, left: 60, right: 40 }}
                />
              </figure>
            </article>

            <article className="chartcard">
              <h3>Most Popular Sets</h3>
              <figure className="chartwrapper">
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      dataKey: "set",
                      tickPlacement: "middle",
                      tickLabelPlacement: "middle",
                    },
                  ]}
                  series={[
                    {
                      dataKey: "count",
                      label: "Number of Cards",
                      color: "#3c5aa6",
                    },
                  ]}
                  dataset={chartData.setData}
                  width={500}
                  height={300}
                  margin={{ top: 40, bottom: 80, left: 60, right: 40 }}
                />
              </figure>
            </article>
          </section>
        ) : null}
      </section>

      <form className="controls">
        <fieldset className="searchcontainer">
          <input
            type="text"
            placeholder="Search Cards:"
            value={searchTerm}
            onChange={handleSearchChange}
            className="searchinput"
          />
        </fieldset>

        <aside className="resultsinfo"></aside>
      </form>

      <section className="cardsgrid">
        {cards.length > 0 ? (
          cards.map((card) => (
            <Link key={card.id} to={`/card/${card.id}`} className="cardlink">
              <article className="carditem">
                <figure className="cardimage">
                  <img src={card.image} alt={card.name} />
                </figure>

                <section className="cardinfo">
                  <h3 className="cardname">{card.name}</h3>

                  <ul className="cardtypes">
                    {card.types.map((type) => (
                      <li key={type} className={`type ${type.toLowerCase()}`}>
                        {type}
                      </li>
                    ))}
                  </ul>
                  {/*

                        dl (Description List)
                        dt (Description Term)
                        dd (Description Details)

              */}
                  <dl className="cardstats">
                    <div className="statitem">
                      <dt>HP:</dt>
                      <dd>{card.hp}</dd>
                    </div>
                    <div className="statitem">
                      <dt>Price:</dt>
                      <dd>${card.price}</dd>
                    </div>
                    <div className="statitem">
                      <dt>Set:</dt>
                      <dd>{card.set}</dd>
                    </div>
                  </dl>

                  <aside className="carddescription">
                    <p>{card.description}</p>
                  </aside>
                </section>
              </article>
            </Link>
          ))
        ) : (
          <aside className="noresults">
            <h3>No cards found aww </h3>
          </aside>
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/card/:cardId" element={<CardDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
