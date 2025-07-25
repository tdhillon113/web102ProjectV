import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { BarChart } from '@mui/x-charts/BarChart';
import "./App.css";

// CardDetail component moved from separate file
function CardDetail() {
  const { cardId } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCardDetail = async () => {
      try {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
          headers: {
            'X-Api-Key': 'e3054edd-1ebe-44c9-a023-f2f425a2bbb4'
          }
        });
        const { data } = await response.json();
        
        // Destructure to avoid repetitive .data calls
        const {
          id,
          name,
          set,
          types,
          hp,
          images,
          tcgplayer,
          rarity,
          artist
        } = data;
        
        // Extract price from tcgplayer data more efficiently
        const getCardPrice = () => {
          if (!tcgplayer?.prices) return 'N/A';
          const { holofoil, normal, reverseHolofoil } = tcgplayer.prices;
          return holofoil?.market || normal?.market || reverseHolofoil?.market || 'N/A';
        };
        
        const cardDetail = {
          id,
          name,
          set: set?.name || 'Unknown Set',
          types: types || ['Colorless'],
          hp: hp || 'N/A',
          image: images?.large || images?.small || '',
          price: getCardPrice(),
          rarity: rarity || 'Common',
          artist: artist || 'Unknown'
        };
        
        setCard(cardDetail);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching card detail:', error);
        setLoading(false);
      }
    };

    if (cardId) {
      fetchCardDetail();
    }
  }, [cardId]);

  if (loading) {
    return (
      <div className="detailcontainer">
        <main className="detailcontent">
          <Link to="/" className="backbutton">← Back to Dashboard</Link>
          <p className="loading">Loading card details...</p>
        </main>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="detailcontainer">
        <main className="detailcontent">
          <Link to="/" className="backbutton">← Back to Dashboard</Link>
          <p className="error">Card not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="detailcontainer">
      <main className="detailcontent">
        <Link to="/" className="backbutton">← Back to Dashboard</Link>
        
        <header className="detailheader">
          <h1>{card.name}</h1>
          {card.types.map(type => (
            <span key={type} className={`type ${type.toLowerCase()}`}>
              {type}
            </span>
          ))}
        </header>

        <div className="detailgrid">
          <section className="detailimagesection">
            <img src={card.image} alt={card.name} className="detailimage" />
            <p><strong>Set:</strong> {card.set}</p>
          </section>

          <section className="detailinfosection">
            <h3>Card Information</h3>
            <p><strong>HP:</strong> {card.hp}</p>
            <p><strong>Rarity:</strong> {card.rarity}</p>
            <p><strong>Set:</strong> {card.set}</p>
            <p><strong>Price:</strong> ${card.price}</p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  const [allCards, setAllCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [displayedCards, setDisplayedCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceSearch, setDebounceSearch] = useState('');
  const cardsPerPage = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebounceSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  //fetch tcg data
  useEffect(() => {
    const fetchCards = async () => {
      try {
        // Build query
        //tcg site: use super type to reference what type to be shwon
        let q = 'supertype:Pokemon';
        if (debounceSearch) {
          q += ` AND name:*${debounceSearch}*`;
          //and operator for combinding search
          // * any char before and after debounce delay
        }
        
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?pageSize=${cardsPerPage}&q=${encodeURIComponent(q)}`, {
          headers: {
            'X-Api-Key': 'e3054edd-1ebe-44c9-a023-f2f425a2bbb4'
          }
        });
        const data = await response.json();
        
        const cardDetails = data.data.map(card => ({
          id: card.id,
          name: card.name,
          set: card.set?.name || 'Unknown Set',
          types: card.types || ['Colorless'],
          hp: card.hp || 'N/A',
          image: card.images?.small || '',
          price: card.tcgplayer?.prices?.holofoil?.market || 
                 card.tcgplayer?.prices?.normal?.market || 
                 card.tcgplayer?.prices?.reverseHolofoil?.market || 'none',
          description: card.flavorText || card.rules?.[0] || 'none',
          supertype: card.supertype || 'Pokemon'
        }));

        setAllCards(cardDetails);
        setFilteredCards(cardDetails);
        setDisplayedCards(cardDetails);
      } catch (error) {
        console.error('error', error);
      }
    };
    
    // Only fetch if we have a search
    if (debounceSearch || allCards.length === 0) {
      fetchCards();
    }
  }, [debounceSearch]);

  // Calculate stats for displayed cards
  const getStats = () => {
    if (displayedCards.length === 0) {
      return { count: 0, highestPrice: 0, lowestPrice: 0 };
    }
    
    const prices = displayedCards
      .map(card => parseFloat(card.price))
      .filter(price => !isNaN(price) && price > 0);
    
    return {
      count: displayedCards.length,
      highestPrice: prices.length > 0 ? Math.max(...prices) : 0,
      lowestPrice: prices.length > 0 ? Math.min(...prices) : 0
    };
  };

  const stats = getStats();

  // Simplified chart data processing
  const chartData = useMemo(() => {
    if (!displayedCards?.length) return { priceData: [], setData: [] };

    // Price distribution
    const priceRanges = { 'Under $1': 0, '$1-$5': 0, '$5-$10': 0, '$10-$20': 0, '$20-$50': 0, '$50+': 0 };
    const setCounts = {};

    displayedCards.forEach(card => {
      // Count price ranges
      const price = parseFloat(card.price);
      if (!isNaN(price) && price > 0) {
        if (price < 1) priceRanges['Under $1']++;
        else if (price < 5) priceRanges['$1-$5']++;
        else if (price < 10) priceRanges['$5-$10']++;
        else if (price < 20) priceRanges['$10-$20']++;
        else if (price < 50) priceRanges['$20-$50']++;
        else priceRanges['$50+']++;
      }
      
      // Count sets
      setCounts[card.set] = (setCounts[card.set] || 0) + 1;
    });

    return {
      priceData: Object.entries(priceRanges).map(([range, count]) => ({ range, count })),
      setData: Object.entries(setCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([set, count]) => ({ set: set.length > 15 ? set.substring(0, 15) + '...' : set, count }))
    };
  }, [displayedCards]);

  return (
    <div className="app">
      <header className="header">
        <h1> Bootleg Pokemon TCG </h1>
        <p>Explore The World of Pokemon Trading </p>
      </header>

      <div className="stats">
        <div className="statbox">
          <h3>Cards Found</h3>
          <p>{stats.count}</p>
        </div>
        <div className="statbox">
          <h3>Highest Price</h3>
          <p>${stats.highestPrice.toFixed(2)}</p>
        </div>
        <div className="statbox">
          <h3>Lowest Price</h3>
          <p>${stats.lowestPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="chartscontainer">
        {displayedCards && displayedCards.length > 0 ? (
          <div className="chartsgrid">
            {/* Price Range Distribution - Bar Chart */}
            <div className="chartcard">
              <h3>Price Range Distribution</h3>
              <div className="chartwrapper">
                <BarChart
                  xAxis={[{
                    scaleType: 'band',
                    dataKey: 'range',
                    tickPlacement: 'middle',
                    tickLabelPlacement: 'middle'
                  }]}
                  series={[{
                    dataKey: 'count',
                    label: 'Number of Cards',
                    color: '#c7a008'
                  }]}
                  dataset={chartData.priceData}
                  width={400}
                  height={300}
                  margin={{ top: 40, bottom: 60, left: 60, right: 40 }}
                />
              </div>
              <p className="chartdescription">
                Displays how cards are distributed across different price ranges. 
                This helps understand the market value distribution of your Pokemon cards.
              </p>
            </div>

            {/* Set Popularity - Bar Chart */}
            <div className="chartcard">
              <h3>Most Popular Sets</h3>
              <div className="chartwrapper">
                <BarChart
                  xAxis={[{
                    scaleType: 'band',
                    dataKey: 'set',
                    tickPlacement: 'middle',
                    tickLabelPlacement: 'middle'
                  }]}
                  series={[{
                    dataKey: 'count',
                    label: 'Number of Cards',
                    color: '#3c5aa6'
                  }]}
                  dataset={chartData.setData}
                  width={500}
                  height={300}
                  margin={{ top: 40, bottom: 80, left: 60, right: 40 }}
                />
              </div>
              <p className="chartdescription">
                Shows which Pokemon sets have the most cards in your current search results. 
                This indicates set popularity and availability.
              </p>
            </div>
          </div>
        ) : (
          <div className="chartsplaceholder">
            <h3>No data available for charts</h3>
            <p>Search for Pokemon cards to see data visualizations</p>
          </div>
        )}
      </div>

      <div className="controls">
        <div className="searchcontainer">
          <input
            
            type="text"
            placeholder="Search Cards: "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="searchinput"
          />
        </div>
        
        <div className="resultsinfo">
        </div>
      </div>

      <div className="cardsgrid">
        {displayedCards.length > 0 ? (
          displayedCards.map((card) => (
            <Link key={card.id} to={`/card/${card.id}`} className="cardlink">
              <div className="carditem">
                <div className="cardimage">
                  <img src={card.image} alt={card.name} />
                </div>
                
                <div className="cardinfo">
                  <h3 className="cardname">{card.name}</h3>
                  
                  <div className="cardtypes">
                    {card.types.map(type => (
                      <div key={type} className={`type ${type.toLowerCase()}`}>
                        {type}
                      </div>
                    ))}
                  </div>
                  
                  <div className="cardstats">
                    <div className="statitem">
                      <p>HP:</p>
                      <p>{card.hp}</p>
                    </div>
                    <div className="statitem">
                      <p>Price:</p>
                      <p>${card.price}</p>
                    </div>
                    <div className="statitem">
                      <p>Set:</p>
                      <p>{card.set}</p>
                    </div>
                  </div>
                  
                  <div className="carddescription">
                    <p>{card.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="noresults">
            <h3>No cards found aww </h3>
          </div>
        )}
      </div>
    </div>
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