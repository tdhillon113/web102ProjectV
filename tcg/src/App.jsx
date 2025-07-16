import { useState, useEffect } from 'react';
import "./App.css";

function App() {
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
            <div key={card.id} className="carditem">
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

export default App;
