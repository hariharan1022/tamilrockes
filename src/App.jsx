import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Home, 
  Film, 
  Tv, 
  Gamepad2, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Download, 
  Info, 
  ArrowLeft,
  X,
  TrendingUp,
  Award,
  Star,
  Sparkles
} from 'lucide-react';
import { movies, categories } from './data/movies';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState('home-page');
  const [navCategory, setNavCategory] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Admin Side State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginChoices, setShowLoginChoices] = useState(false);
  const [adminUser, setAdminUser] = useState({ user: '', pass: '' });
  
  // Persistent Movie Database (Syncs with LocalStorage)
  const [adminMovies, setAdminMovies] = useState(() => {
    const saved = localStorage.getItem('sk_movies_db');
    return saved ? JSON.parse(saved) : movies;
  });

  useEffect(() => {
    localStorage.setItem('sk_movies_db', JSON.stringify(adminMovies));
  }, [adminMovies]);

  const [isEditing, setIsEditing] = useState(null);
  const [newMovie, setNewMovie] = useState({ 
    title: '', 
    description: '', 
    image: '', 
    telegramLink: '', 
    categories: [], 
    rank: 0,
    year: '2025',
    quality: 'HD',
    rating: '98%'
  });

  // 1. Memoized Data for Performance
  const featuredMovies = useMemo(() => 
    adminMovies.filter(m => m && m.rank > 0 && m.rank <= 5).sort((a, b) => a.rank - b.rank),
  [adminMovies]);

  const categoryLabels = useMemo(() => {
    const map = {};
    categories.forEach(c => map[c.key] = c.label);
    return map;
  }, []);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return adminMovies.slice(0, 24); // Show first 24 if empty
    const query = searchQuery.toLowerCase().trim();
    return adminMovies.filter(m => 
      m && m.title && m.title.toLowerCase().includes(query) || 
      (m && m.description && m.description.toLowerCase().includes(query)) ||
      (m && m.categories && m.categories.some(cat => cat.toLowerCase().includes(query)))
    );
  }, [searchQuery, adminMovies]);

  // 2. Functional Handlers
  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > 30;
    if (scrolled !== isScrolled) setIsScrolled(scrolled);
  }, [isScrolled]);

  const handleMouseMove = useCallback((e) => {
    // Parallax logic disabled to save resources
  }, []);

  const openMovieDetails = (movie) => {
    setSelectedMovie(movie);
    document.body.style.overflow = 'hidden'; // Stop background scroll
  };

  const closeMovieDetails = () => {
    setSelectedMovie(null);
    document.body.style.overflow = 'auto'; // Re-enable scroll
  };

  const showView = (view, cat) => {
    setCurrentView(view);
    setNavCategory(cat);
    setShowLoginChoices(false);
    closeMovieDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'search-page') setIsSearching(true);
    else {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const loginAdmin = () => {
    if (adminUser.user === 'admin' && adminUser.pass === 'admin') {
      setIsAdminLoggedIn(true);
      showView('admin-dashboard', 'admin');
    } else {
      alert('Invalid Credentials!');
    }
  };

  const handleAddMovie = () => {
    if (!newMovie.title || !newMovie.image) return alert('Please add at least title and image!');
    const movieData = { ...newMovie };
    if (isEditing) {
       setAdminMovies(prev => prev.map(m => m.title === isEditing ? movieData : m));
       setIsEditing(null);
    } else {
       setAdminMovies(prev => [movieData, ...prev]);
    }
    setNewMovie({ title: '', description: '', image: '', telegramLink: '', categories: [], rank: 0, year: '2025', quality: 'HD', rating: '98%' });
  };

  const deleteMovie = (title) => {
    if (window.confirm('Delete this movie from the library?')) {
      setAdminMovies(prev => prev.filter(m => m.title !== title));
    }
  };

  const editMovie = (movie) => {
    setNewMovie({
      ...movie,
      year: movie.year || '2025',
      quality: movie.quality || 'HD',
      rating: movie.rating || '98%'
    });
    setIsEditing(movie.title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3. Lifecycle Hooks
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (currentView === 'home-page' && navCategory === 'home' && !selectedMovie && featuredMovies.length > 0) {
      const interval = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % featuredMovies.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [currentView, navCategory, featuredMovies.length, selectedMovie]);

  // 4. Sub-Components (Internal for now for simplicity of file management)
  const MovieCard = ({ movie, rank, isTop10 }) => (
    <motion.div 
      className={isTop10 ? "top-10-item" : "movie-item"}
      whileHover={{ scale: 1.04, y: -4, zIndex: 50 }}
      whileTap={{ scale: 0.96 }}
      layout
      onClick={() => openMovieDetails(movie)}
    >
      <div className="rank-wrapper">
        <div className="poster-container shadow-sm">
          {isTop10 && <span className="rank-digit">{rank}</span>}
          <img loading="lazy" src={`/images/${movie.image}`} alt={movie.title} />
          <div className="poster-overlay">
            <Play fill="white" size={32} />
          </div>
        </div>
        <p className="poster-title-overlap">{movie.title}</p>
      </div>
    </motion.div>
  );

  const MovieRow = ({ title, catKey, isTop10 }) => {
    const listRef = useRef(null);
    const rowContent = useMemo(() => {
      let f = adminMovies.filter(m => m && m.categories && m.categories.includes(catKey));
      if (isTop10) return f.sort((a,b) => (a.rank || 0) - (b.rank || 0));
      return f;
    }, [adminMovies, catKey, isTop10]);

    const scrollRow = (dir) => {
      if (listRef.current) {
        const amount = listRef.current.clientWidth * 0.75;
        listRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
      }
    };

    if (rowContent.length === 0) return null;

    return (
      <div className="row-wrapper">
        <div className="row-info">
          <h3>
            {isTop10 && <TrendingUp size={20} className="mr-2 text-red-600" />}
            {title}
          </h3>
        </div>
        <div className="relative group">
          <button className="row-arrow left" onClick={() => scrollRow('left')}><ChevronLeft /></button>
          <div className="row-list" ref={listRef}>
            {rowContent.map((m, i) => (
              <MovieCard key={m.title + i} movie={m} rank={m.rank || i + 1} isTop10={isTop10} />
            ))}
          </div>
          <button className="row-arrow right" onClick={() => scrollRow('right')}><ChevronRight /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <header className={`navbar-fixed ${isScrolled || currentView !== 'home-page' || navCategory !== 'home' ? 'bg-solid' : 'bg-gradient'}`}>
        <div className="navbar-container">
          <motion.h1 
            className="site-logo"
            whileTap={{ scale: 0.9 }}
            onClick={() => showView('home-page', 'home')}
          >
            SK<span>MOVIES</span>
          </motion.h1>

          <div className="navbar-actions">
            <div className={`expanded-search ${isSearching ? 'open' : ''}`}>
              <Search size={22} className="s-icon" onClick={() => showView('search-page', 'search')} />
              {isSearching && (
                <input 
                  type="text" 
                  placeholder="Search titles, genres..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              )}
              {isSearching && searchQuery && <X size={20} className="c-icon" onClick={() => setSearchQuery('')} />}
            </div>
          </div>
        </div>
      </header>

      <main className="main-viewport">
        {currentView === 'home-page' && (
          <div className="home-view">
            {navCategory === 'home' && featuredMovies.length > 0 && (
              <section className="hero-landing">
                {/* Netflix-style Top Pills */}
                <div className="hero-top-nav">
                  <div className="pill" onClick={() => showView('home-page', 'webseries')}>TV Shows</div>
                  <div className="pill" onClick={() => showView('home-page', 'movies')}>Movies</div>
                  <div className="pill" onClick={() => showView('home-page', 'home')}>Categories</div>
                </div>

                <div className="hero-card-container">
                  <AnimatePresence mode="wait">
                    {featuredMovies[heroIndex] && (
                      <motion.div 
                        key={heroIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.5 }}
                        className="hero-main-card"
                        style={{ backgroundImage: `url("/images/${featuredMovies[heroIndex].image}")` }}
                      >
                        <div className="hero-card-overlay">
                          <div className="hero-card-content">
                            <div className="flex flex-col items-center mb-4">
                               <div className="flex items-center gap-2 mb-1">
                                 <div className="brand-logo-small">SK</div>
                                 <span className="text-xs font-black tracking-[0.2em] opacity-80 uppercase mt-1">MOVIES</span>
                               </div>
                               <div className="text-[10px] font-bold text-red-500 tracking-wider">
                                 TRENDING #{featuredMovies[heroIndex].rank}
                               </div>
                            </div>
                            
                            <h2 className="hero-card-title">{featuredMovies[heroIndex].title}</h2>
                            
                            <div className="hero-tags">
                              {featuredMovies[heroIndex].categories.map((c, i) => (
                                <span key={c}>{i > 0 && " • "}{c}</span>
                              ))}
                            </div>
                            
                            <div className="hero-btn-group">
                              <motion.button 
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="btn-netflix-play"
                                onClick={() => openMovieDetails(featuredMovies[heroIndex])}
                              >
                                <Play fill="currentColor" size={24} /> Play
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="btn-netflix-list"
                                onClick={() => openMovieDetails(featuredMovies[heroIndex])}
                              >
                                <Info size={24} /> Details
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            )}

            <div className="rows-scroller">
              {navCategory === 'home' ? (
                <>
                  <MovieRow title="Top 10 Rankings" catKey="top10" isTop10 />
                  <MovieRow title="Recently Added" catKey="recent" />
                  <MovieRow title="Action Blockbusters" catKey="action" />
                  <MovieRow title="Family Comedies" catKey="comedy" />
                  <MovieRow title="Romance Classics" catKey="romance" />
                </>
              ) : navCategory === 'movies' ? (
                <>
                  <MovieRow title="Featured Movies" catKey="movies" />
                  <MovieRow title="Action" catKey="action" />
                  <MovieRow title="Comedy" catKey="comedy" />
                  <MovieRow title="Romance" catKey="romance" />
                  <MovieRow title="Thriller" catKey="thriller" />
                </>
              ) : (
                <div className="grid-view-container">
                  <header className="category-section-header">
                    <div className="cat-brand-pill">
                       {navCategory === 'anime' ? <Sparkles size={16} /> : 
                        navCategory === 'webseries' ? <Tv size={16} /> : 
                        navCategory === 'movies' ? <Film size={16} /> : <TrendingUp size={16} />}
                       {categoryLabels.find(c => c.key === navCategory)?.label.replace(/[^a-zA-Z0-9 ]/g, '') || categoryLabels[navCategory]}
                    </div>
                    <h2>{categoryLabels.find(c => c.key === navCategory)?.label.replace(/[^a-zA-Z0-9 ]/g, '') || categoryLabels[navCategory]}</h2>
                    <div className="cat-desc-line">Exploring the best in {navCategory.toUpperCase()} • 4K UHD Streaming Hub</div>
                  </header>
                  <div className="responsive-grid">
                    {adminMovies.filter(m => m && m.categories && m.categories.includes(navCategory)).map((m, i) => (
                      <MovieCard key={m.title + i} movie={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'search-page' && (
          <div className="search-view-container">
            <header className="px-6 mb-8">
              <h2 className="text-2xl font-bold opacity-60">
                {searchQuery ? `Results for "${searchQuery}"` : "Discover New Stories"}
              </h2>
            </header>
            <div className="responsive-grid px-6">
              {filteredMovies.map((m, i) => (
                <motion.div 
                  key={m.title + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                >
                   <MovieCard movie={m} />
                </motion.div>
              ))}
            </div>
            {filteredMovies.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 opacity-30">
                <Search size={64} />
                <p className="mt-4 text-xl">No matches found. Try another term.</p>
              </div>
            )}
          </div>
        )}        {currentView === 'admin-login' && (
          <div className="netflix-login-container" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/images/netflix-bg.png')` }}>
            <div className="netflix-login-box">
              <h2>Sign In</h2>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Email or phone number" 
                  onChange={e => setAdminUser({...adminUser, user: e.target.value})}
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  onChange={e => setAdminUser({...adminUser, pass: e.target.value})}
                />
              </div>
              <button className="btn-netflix-red" onClick={loginAdmin}>Sign In</button>
              
              <div className="flex justify-between text-[13px] opacity-60 mt-4">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="accent-[#b3b3b3]" /> Remember me</label>
                <a href="#">Need help?</a>
              </div>

              <div className="mt-8">
                 <p className="text-[#737373]">New to SK? <span className="text-white cursor-pointer hover:underline" onClick={() => showView('home-page', 'home')}>Sign up now.</span></p>
                 <p className="text-[#8c8c8c] text-[13px] mt-2">This page is protected by Google reCAPTCHA to ensure you're not a bot.</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'admin-dashboard' && isAdminLoggedIn && (
          <div className="admin-dashboard-view">
             <header className="admin-header">
               <div className="flex flex-col">
                 <h2 className="text-3xl font-black text-red-600">Site Management</h2>
                 <p className="text-xs opacity-50 uppercase tracking-[4px]">Advanced Movie Console</p>
               </div>
               <div className="admin-stats">
                 <div className="stat"><span>Total Assets:</span> {adminMovies.length}</div>
                 <div className="stat"><span>Spotlight:</span> {featuredMovies.length}</div>
               </div>
             </header>

             <div className="admin-content grid grid-cols-1 xl:grid-cols-12 gap-10 p-0">
                <div className="admin-form-box xl:col-span-4">
                   <h3>{isEditing ? 'Modify Property' : 'Create New Asset'}</h3>
                   
                   <div className="form-group-row">
                     <input type="text" placeholder="Title" value={newMovie.title} onChange={e => setNewMovie({...newMovie, title: e.target.value})} />
                   </div>

                   <textarea placeholder="Story Summary" rows="3" value={newMovie.description} onChange={e => setNewMovie({...newMovie, description: e.target.value})} />
                   
                   <div className="grid grid-cols-2 gap-4">
                     <input type="text" placeholder="Release Year" value={newMovie.year} onChange={e => setNewMovie({...newMovie, year: e.target.value})} />
                     <input type="text" placeholder="Quality (HD/UHD)" value={newMovie.quality} onChange={e => setNewMovie({...newMovie, quality: e.target.value})} />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <input type="text" placeholder="Match % (Rating)" value={newMovie.rating} onChange={e => setNewMovie({...newMovie, rating: e.target.value})} />
                     <input type="number" placeholder="Hero Rank (0-5)" value={newMovie.rank} onChange={e => setNewMovie({...newMovie, rank: parseInt(e.target.value) || 0})} />
                   </div>

                   <input type="text" placeholder="Poster Image Filename" value={newMovie.image} onChange={e => setNewMovie({...newMovie, image: e.target.value})} />
                   <input type="text" placeholder="Direct Download (Telegram)" value={newMovie.telegramLink} onChange={e => setNewMovie({...newMovie, telegramLink: e.target.value})} />
                   
                   <div className="cat-picker">
                     <p className="label">Display Categories (Lists):</p>
                     <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                       {categories.map(c => (
                         <label key={c.key} className="flex items-center gap-3 cursor-pointer group">
                           <input 
                            type="checkbox" 
                            className="accent-red-600 w-4 h-4"
                            checked={newMovie.categories.includes(c.key)} 
                            onChange={e => {
                              const cats = e.target.checked 
                                ? [...newMovie.categories, c.key] 
                                : newMovie.categories.filter(x => x !== c.key);
                              setNewMovie({...newMovie, categories: cats});
                            }} 
                           />
                           <span className="text-xs group-hover:text-red-500 transition-colors uppercase font-bold tracking-tight">{c.label.replace(/[^a-zA-Z0-9 ]/g, '')}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                   
                   <div className="flex gap-4 mt-8">
                     <button className="btn-add flex-1" onClick={handleAddMovie}>
                       {isEditing ? 'COMMIT CHANGES' : 'PUBLISH MOVIE'}
                     </button>
                     {isEditing && (
                       <button className="btn-cancel px-6" onClick={() => { 
                         setIsEditing(null); 
                         setNewMovie({title:'',description:'',image:'',telegramLink:'',categories:[],rank:0,year:'2025',quality:'HD',rating:'98%'}); 
                       }}>X</button>
                     )}
                   </div>

                   <div className="mt-8 pt-8 border-t border-white/5">
                      <p className="text-[10px] opacity-30 uppercase font-black mb-4 tracking-widest">Asset Preview</p>
                      <div className="flex gap-4 items-center">
                         <div className="w-20 h-28 bg-[#222] rounded overflow-hidden shadow-2xl relative">
                            {newMovie.image ? <img src={`/images/${newMovie.image}`} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full opacity-20"><Film /></div>}
                            <div className="absolute top-1 left-1 bg-red-600 text-[8px] font-black px-1 rounded-sm">SK</div>
                         </div>
                         <div className="flex flex-col">
                            <h4 className="font-black text-sm leading-tight mb-1">{newMovie.title || 'Untitled Movie'}</h4>
                            <div className="flex gap-2 text-[9px] font-bold opacity-60 uppercase">
                               <span>{newMovie.year}</span>
                               <span className="text-red-500">{newMovie.quality}</span>
                               <span className="text-green-500">{newMovie.rating}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                               {newMovie.categories.slice(0,3).map(cat => (
                                 <span key={cat} className="bg-white/5 px-2 py-0.5 rounded-full text-[8px] uppercase">{cat}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="admin-table-box xl:col-span-8">
                   <div className="flex justify-between items-center mb-6">
                     <h3>Content Library</h3>
                     <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-40">
                        <TrendingUp size={12} className="text-green-500 animate-pulse" />
                        Auto-Synced to Local DB
                     </div>
                   </div>
                   <div className="table-scroll">
                     <table>
                       <thead>
                         <tr>
                           <th>Asset</th>
                           <th>Properties</th>
                           <th>Taxonomy</th>
                           <th>Spot</th>
                           <th>Edit</th>
                         </tr>
                       </thead>
                       <tbody>
                         {adminMovies.map(m => (
                           <tr key={m.title}>
                             <td>
                                <div className="flex items-center gap-4">
                                   <img src={`/images/${m.image}`} className="w-10 h-14 object-cover rounded shadow-lg ring-1 ring-white/10" />
                                   <div className="flex flex-col">
                                      <span className="font-bold text-sm block">{m.title}</span>
                                      <span className="text-[10px] opacity-40">{m.year || '2025'} • {m.quality || 'HD'}</span>
                                   </div>
                                </div>
                             </td>
                             <td>
                               <div className="text-[11px] font-bold text-green-500 bg-green-500/5 px-2 py-1 rounded inline-block">
                                  {m.rating || '98%'}
                               </div>
                             </td>
                             <td className="text-[10px] opacity-40 uppercase font-black tracking-tighter">
                                {m.categories.slice(0, 4).join(' | ')}
                                {m.categories.length > 4 && ' ...'}
                             </td>
                             <td><span className={m.rank > 0 ? 'text-red-500 font-black' : 'opacity-20'}>{m.rank || 'OFF'}</span></td>
                             <td>
                               <div className="flex gap-4">
                                 <button onClick={() => editMovie(m)} className="text-white bg-blue-600/20 p-2 rounded hover:bg-blue-600 transition-colors"><Star size={16} /></button>
                                 <button onClick={() => deleteMovie(m.title)} className="text-white bg-red-600/20 p-2 rounded hover:bg-red-600 transition-colors"><X size={16} /></button>
                               </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMovieDetails}
          >
            <motion.div 
              className="modal-body"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-hero-box" style={{ backgroundImage: `linear-gradient(to top, #000 0%, rgba(0,0,0,0.5) 40%, transparent 100%), url('/images/${selectedMovie.image}')` }}>
                <button className="modal-exit" onClick={closeMovieDetails}><X /></button>
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="modal-hero-info"
                >
                  <div className="flex items-center gap-2 mb-3">
                     <div className="brand-logo-small">SK</div>
                     <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">EXCLUSIVE</span>
                  </div>
                  <h2>{selectedMovie.title}</h2>
                  <div className="modal-top-actions">
                    <button className="btn-main-play"><Play fill="currentColor" size={20} /> Watch Trailer</button>
                    <button className="btn-icon-round"><TrendingUp size={20} /></button>
                    <button className="btn-icon-round"><Star size={20} /></button>
                  </div>
                </motion.div>
              </div>

              <div className="modal-content-scrollable">
                <div className="modal-meta-row">
                  <div className="meta-left">
                    <div className="meta-badges">
                      <span className="badge-new">98% Match</span>
                      <span className="badge-outline">2024</span>
                      <span className="badge-fill">UHD</span>
                      <span className="badge-outline">5.1 Audio</span>
                    </div>
                    <p className="modal-plot">
                      {selectedMovie.description || "An extraordinary cinematic experience that pushes the boundaries of storytelling. Follow the gripping journey of the lead characters as they navigate through life-altering challenges and emotional triumphs."}
                    </p>
                  </div>
                </div>

                <div className="download-hub">
                  <h4><Download size={18} className="mr-2" /> Download Direct</h4>
                  <div className="download-grid">
                    {[
                      { l: '480p - SD', s: '450MB' },
                      { l: '720p - HD', s: '1.2GB' },
                      { l: '1080p - FHD', s: '2.5GB' },
                      { l: '2160p - 4K', s: '8.4GB' }
                    ].map((d, i) => (
                      <motion.a 
                        key={d.l}
                        href={selectedMovie.telegramLink}
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + (i * 0.1) }}
                        className="download-card"
                      >
                        <div className="dl-info">
                          <span className="dl-label">{d.l}</span>
                          <span className="dl-size">{d.s}</span>
                        </div>
                        <Download size={18} className="opacity-40" />
                      </motion.a>
                    ))}
                  </div>
                </div>

                <div className="more-like-this">
                  <h4>More Like This</h4>
                  <div className="similar-row">
                    {adminMovies && adminMovies.length > 0 && adminMovies
                      .filter(m => m && m.categories && selectedMovie && selectedMovie.categories && 
                                   m.categories.some(c => selectedMovie.categories.includes(c)) && 
                                   m.title !== selectedMovie.title)
                      .sort(() => Math.random() - 0.5) // Randomize results
                      .slice(0, 8)
                      .map((m, i) => (
                        <div key={m.title + i} className="similar-card" onClick={() => openMovieDetails(m)}>
                           <img src={`/images/${m.image}`} alt={m.title} />
                           <div className="sim-overlay">
                             <Play size={20} />
                           </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Choice Popover */}
      <AnimatePresence>
        {showLoginChoices && (
           <motion.div 
            className="login-popover-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLoginChoices(false)}
           >
              <motion.div 
               className="login-choice-card"
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               onClick={e => e.stopPropagation()}
              >
                 <h3>Choose Your Side</h3>
                 <div className="choice-buttons">
                    <button onClick={() => showView('admin-login', 'admin')} className="c-btn-admin">
                       <Award size={24} />
                       <span>Admin Logic</span>
                    </button>
                    <button onClick={() => showView('home-page', 'home')} className="c-btn-user">
                       <Home size={24} />
                       <span>User Mode</span>
                    </button>
                 </div>
                 <p className="text-[10px] opacity-40 mt-4 text-center">SK MOVIES • PLATFORM V2.0</p>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <nav className="tab-bar">
        <div className={`tab-link ${navCategory === 'home' && currentView === 'home-page' ? 'active' : ''}`} onClick={() => showView('home-page', 'home')}>
          <Home size={22} /><span className="text-[10px] mt-1">Home</span>
        </div>
        <div className={`tab-link ${navCategory === 'movies' ? 'active' : ''}`} onClick={() => showView('home-page', 'movies')}>
          <Film size={22} /><span className="text-[10px] mt-1">Movies</span>
        </div>
        
        {/* Centered SK Branding Logo */}
        <div className="sk-brand-trigger" onClick={() => setShowLoginChoices(!showLoginChoices)}>
           <div className="n-logo-wrapper">
              <span className="n-letter">S</span>
              <span className="n-letter">K</span>
           </div>
           <div className="n-shadow"></div>
        </div>

        <div className={`tab-link ${navCategory === 'anime' ? 'active' : ''}`} onClick={() => showView('home-page', 'anime')}>
          <Sparkles size={22} /><span className="text-[10px] mt-1">Anime</span>
        </div>
        <div className={`tab-link ${navCategory === 'webseries' ? 'active' : ''}`} onClick={() => showView('home-page', 'webseries')}>
          <Tv size={22} /><span className="text-[10px] mt-1">Series</span>
        </div>
      </nav>
    </div>
  );
}

export default App;
