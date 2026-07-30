import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Film,
  Tv,
  ChevronRight,
  ChevronLeft,
  Play,
  Download,
  Info,
  ArrowLeft,
  X,
  Award,
  Star,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  BarChart3,
  Cloud,
  Baby,
  Languages,
  Layout, // Added Layout icon
  Send,
  Share2,
  Bot, // Added Bot icon
  TrendingUp, // Added TrendingUp icon
  ThumbsUp,
} from "lucide-react";
import { supabase } from "./config/supabase";
import { categories } from "./data/movies";
import "./index.css";

const getImgSrc = (img) => {
  if (!img) return '';
  return img.startsWith('data:') ? img : `images/${img}`;
};

const compressImage = (file, maxWidth, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

function App() {
  const [currentView, setCurrentView] = useState("home-page");
  const [navCategory, setNavCategory] = useState("home");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  // Admin Side State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginChoices, setShowLoginChoices] = useState(false); // Used for SK Footer Portal
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I am your TamilMob AI Bot. 🎥 Just type a movie name, and I will find the link for you or explain why it's not available!",
    },
  ]);
  const [adminUser, setAdminUser] = useState({ user: "", pass: "" });
  const [adminMovies, setAdminMovies] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [newMovie, setNewMovie] = useState({
    title: "",
    description: "",
    image: "",
    telegramLink: "",
    categories: [],
    rank: 0,
    year: "2025",
    quality: "HD",
    rating: "98%",
    landscape_image: "",
  });
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("all");

  const fetchMovies = async () => {
    setIsSyncing(true);
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setAdminMovies(data);
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchMovies();
    const channel = supabase
      .channel("movies-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movies" },
        () => fetchMovies(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const featuredMovies = useMemo(() => {
    // Filter for movies marked as 'top10' category
    const top10s = adminMovies.filter(
      (m) => m && m.categories?.includes("top10"),
    );
    if (top10s.length > 0)
      return top10s.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    // Fallback if no top10s exist yet
    return adminMovies.slice(0, 5);
  }, [adminMovies]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return adminMovies.slice(0, 30);
    const query = searchQuery.toLowerCase().trim();
    return adminMovies.filter(
      (m) =>
        m.title?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.categories?.some((cat) => cat.toLowerCase().includes(query)),
    );
  }, [searchQuery, adminMovies]);

  // Live suggestions — top 8 matches while typing
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase().trim();
    return adminMovies
      .filter((m) => m.title?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, adminMovies]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const randomRecommendations = useMemo(() => {
    if (!adminMovies.length) return [];
    return [...adminMovies]
      .filter((m) => m.title !== selectedMovie?.title)
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
  }, [adminMovies, selectedMovie]);

  const filteredAdminMovies = useMemo(() => {
    return adminMovies.filter((m) => {
      const matchesSearch =
        !adminSearchQuery.trim() ||
        m.title?.toLowerCase().includes(adminSearchQuery.toLowerCase().trim()) ||
        m.description?.toLowerCase().includes(adminSearchQuery.toLowerCase().trim());
      const matchesCategory =
        adminCategoryFilter === "all" ||
        m.categories?.includes(adminCategoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [adminMovies, adminSearchQuery, adminCategoryFilter]);

  const handleShare = () => {
    const shareData = {
      title: selectedMovie?.title || "Tamil Mob",
      text: `Watch ${selectedMovie?.title || ""} on Tamil Mob!`,
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleAISend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const currentInput = chatInput;
    const userMsg = { role: "user", content: currentInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // AI Processing logic
    setTimeout(() => {
      const query = currentInput.toLowerCase().trim();
      const match = adminMovies.find((m) =>
        m.title.toLowerCase().includes(query),
      );

      let botResponse = "";
      if (match) {
        botResponse = `Found it! 🎬 You can access "${match.title}" right here: ${match.telegramLink || "Link updating..."}`;
      } else {
        const reasons = [
          "This cinematic masterpiece hasn't been released digitally yet. We'll update as soon as it's official!",
          "Our servers are currently being prepared for this title. Please check back in a few days!",
          "This movie is still exclusive to theaters. Stay tuned for the digital debut on TamilMob!",
          "We are currently negotiating for the best quality version of this film for our users.",
        ];
        botResponse = `Apologies, but "${currentInput}" is not in our direct library yet. ${reasons[Math.floor(Math.random() * reasons.length)]}`;
      }

      setChatMessages((prev) => [
        ...prev,
        { role: "bot", content: botResponse },
      ]);
    }, 1000);
  };

  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > 30;
    if (scrolled !== isScrolled) setIsScrolled(scrolled);
  }, [isScrolled]);

  const openMovieDetails = (movie) => {
    setSelectedMovie(movie);
    setCurrentView("movie-details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeMovieDetails = () => {
    setSelectedMovie(null);
    setCurrentView("home-page");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showView = (view, cat) => {
    setCurrentView(view);
    if (cat) setNavCategory(cat);
    setShowLoginChoices(false);
    setSelectedMovie(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsSearching(view === "search-page");
    if (view !== "search-page") setSearchQuery("");
  };

  const loginAdmin = () => {
    if (adminUser.user === "hariharanmahesh34@gmail.com" && adminUser.pass === "123harimahesh") {
      setIsAdminLoggedIn(true);
      showView("admin-dashboard", "admin");
    } else alert("Invalid Credentials!");
  };

  const handleLogOut = () => {
    setIsAdminLoggedIn(false);
    showView("home-page", "home");
  };

  const handleResetForm = () => {
    setNewMovie({
      title: "",
      description: "",
      image: "",
      telegramLink: "",
      categories: [],
      rank: 0,
      year: "2025",
      quality: "HD",
      rating: "98%",
      landscape_image: "",
    });
    setIsEditing(null);
  };

  const handleAddMovie = async () => {
    if (!newMovie.title || !newMovie.image)
      return alert("Title and Image filename required!");
    setIsSyncing(true);
    const { id, ...movieToSave } = { ...newMovie };
    const { error } = await supabase
      .from("movies")
      .upsert(movieToSave, { onConflict: "title" });
    if (error) alert("Sync Error: " + error.message);
    else {
      setNewMovie({
        title: "",
        description: "",
        image: "",
        telegramLink: "",
        categories: [],
        rank: 0,
        year: "2025",
        quality: "HD",
        rating: "98%",
        landscape_image: "",
      });
      setIsEditing(null);
    }
    setIsSyncing(false);
  };

  const deleteMovie = async (title) => {
    if (!window.confirm(`Delete ${title} globally?`)) return;
    setIsSyncing(true);
    const { error } = await supabase.from("movies").delete().eq("title", title);
    if (error) alert("Delete Error: " + error.message);
    setIsSyncing(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (
      currentView === "home-page" &&
      navCategory === "home" &&
      !selectedMovie &&
      featuredMovies.length > 1
    ) {
      const interval = setInterval(
        () => setHeroIndex((prev) => (prev + 1) % featuredMovies.length),
        8000,
      );
      return () => clearInterval(interval);
    }
  }, [currentView, navCategory, featuredMovies.length, selectedMovie]);

  const MovieCard = ({ movie, rank, isTop10 }) => (
    <motion.div
      className={isTop10 ? "top-10-item" : "movie-item"}
      whileTap={{ scale: 0.96 }}
      layout
      onClick={() => openMovieDetails(movie)}
    >
      <div className={isTop10 ? "top-10-card-content" : "rank-wrapper"}>
        {isTop10 && (
          <div className={`top-10-rank-number ${rank >= 10 ? "double-digit" : ""}`}>
            {rank}
          </div>
        )}
        <div className="poster-hover-group">
          <div className="poster-container shadow-sm">
            <img loading="lazy" src={getImgSrc(movie.image)} alt={movie.title} />
            <div className="poster-play-overlay">
              <div className="play-icon-circle">
                <Download size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const MovieRow = ({ title, catKey, mustInclude, isTop10 }) => {
    const listRef = useRef(null);
    const rowContent = useMemo(() => {
      let filtered = adminMovies.filter((m) => {
        if (!m || !m.categories) return false;
        const matchesKey = m.categories.includes(catKey);
        if (!mustInclude) return matchesKey;
        // Check if item belongs to both the genre AND the filter (e.g. 'anime' AND 'top10')
        return m.categories.includes(mustInclude) && matchesKey;
      });
      if (isTop10) {
        return filtered
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
          .slice(0, 10);
      }
      return filtered;
    }, [adminMovies, catKey, mustInclude, isTop10]);
    if (rowContent.length === 0) return null;
    return (
      <div className="row-wrapper">
        <div className="row-info">
          <h3>{title}</h3>
        </div>
        <div className="row-list-container">
          <button
            className="row-arrow left"
            onClick={() =>
              listRef.current?.scrollBy({ left: -600, behavior: "smooth" })
            }
          >
            <ChevronLeft />
          </button>
          <div className="row-list" ref={listRef}>
            {rowContent.map((m, i) => (
              <MovieCard
                key={m.title + i}
                movie={m}
                rank={m.rank || i + 1}
                isTop10={isTop10}
              />
            ))}
          </div>
          <button
            className="row-arrow right"
            onClick={() =>
              listRef.current?.scrollBy({ left: 600, behavior: "smooth" })
            }
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const activeHero = useMemo(() => {
    let top10s = featuredMovies;
    if (navCategory !== "home") {
      top10s = featuredMovies.filter((m) => {
        if (!m || !m.categories) return false;
        const target = navCategory.toLowerCase();
        if (target === "movies") return true;
        if (target === "cartoons") {
          return m.categories.some(
            (c) =>
              c.toLowerCase() === "cartoon" || c.toLowerCase() === "cartoons",
          );
        }
        return m.categories.some((c) => c.toLowerCase() === target);
      });
    }

    if (top10s.length > 0) {
      return top10s[heroIndex % top10s.length];
    }
    if (featuredMovies.length > 0) {
      return featuredMovies[heroIndex % featuredMovies.length];
    }
    if (adminMovies.length > 0) {
      return adminMovies[0];
    }
    return null;
  }, [featuredMovies, adminMovies, heroIndex, navCategory]);

  if (currentView === "admin-login") {
    return (
      <div className="login-full-screen">
        <div className="login-bg-overlay"></div>
        <div className="login-card-prime">
          <div className="login-logo-brand">Tamil<span>Mob</span></div>
          <h2>Admin Terminal</h2>
          <p>Please enter your access key and password to manage TamilMob.</p>
          <div className="login-form-group">
            <div className="input-with-icon">
              <input
                type="text"
                placeholder="Access Key"
                onChange={(e) =>
                  setAdminUser({ ...adminUser, user: e.target.value })
                }
              />
            </div>
            <div className="input-with-icon">
              <input
                type="password"
                placeholder="Password"
                onChange={(e) =>
                  setAdminUser({ ...adminUser, pass: e.target.value })
                }
              />
            </div>
            <button className="login-submit-btn" onClick={loginAdmin}>Enter Console</button>
            <button
              className="login-submit-btn btn-back-to-user"
              onClick={() => setCurrentView("home-page")}
            >
              Return to User Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header
        className={`navbar-fixed ${isScrolled || currentView !== "home-page" || !activeHero ? "bg-solid" : "bg-gradient"}`}
      >
        <div className={`navbar-container ${isSearching ? "searching" : ""}`}>
          <div className="navbar-left">
            <motion.img
              src={`${import.meta.env.BASE_URL}tamil_mob_logo.png`}
              alt="TamilMob Logo"
              className="site-logo-img"
              whileTap={{ scale: 0.95 }}
              onClick={() => showView("home-page", "home")}
            />
          </div>
          <div className="navbar-actions">
            <div
              className={`expanded-search ${isSearching ? "open" : ""}`}
              ref={searchRef}
            >
              <Search
                size={22}
                className="s-icon"
                onClick={() => showView("search-page", "search")}
              />
              {isSearching && (
                <>
                  <input
                    type="text"
                    placeholder="Search movies..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    autoFocus
                  />
                  {/* Live Autocomplete Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="search-suggestions-dropdown">
                      {searchSuggestions.map((movie, i) => (
                        <a
                          key={i}
                          className="suggestion-item"
                          href={movie.telegramLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setShowSuggestions(false);
                            setSearchQuery("");
                          }}
                        >
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="suggestion-poster"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="suggestion-info">
                            <span className="suggestion-title">{movie.title}</span>
                            <span className="suggestion-meta">
                              {movie.year && <span>{movie.year}</span>}
                              {movie.quality && <span className="suggestion-quality">{movie.quality}</span>}
                            </span>
                          </div>
                          <span className="suggestion-link-icon">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {showSuggestions && searchQuery.trim().length > 0 && searchSuggestions.length === 0 && (
                    <div className="search-suggestions-dropdown">
                      <div className="suggestion-empty">No results found for "{searchQuery}"</div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </header>

      <main className="main-viewport">
        {currentView === "home-page" && (
          <div className="home-view">

            {navCategory === "home" && activeHero && (
              <section className="hero-landing">
                <div
                  className="hero-main-card"
                  style={{
                    backgroundImage: `url("${(window.innerWidth > 768 && activeHero.landscape_image) ? (activeHero.landscape_image.startsWith('data:') ? activeHero.landscape_image : 'images/landscape/' + activeHero.landscape_image) : getImgSrc(activeHero.image)}")`,
                  }}
                >
                  <div className="hero-gradient-overlay">
                    <div className="hero-content">
                      <div className="brand-logo-netflix">Tamil Mob</div>
                      <div className="trending-marker">TRENDING #1</div>
                      <h2 className="hero-title-massive">
                        {activeHero.title}
                      </h2>
                      <div className="hero-tags">
                        {activeHero.categories?.join(" • ") || "Cinema"}
                      </div>
                      <div className="hero-btn-group-netflix">
                        <button
                          className="btn-netflix-play-full"
                          onClick={() => openMovieDetails(activeHero)}
                        >
                          <Download size={22} /> Download
                        </button>
                        <button
                          className="btn-netflix-list-full"
                          onClick={() => openMovieDetails(activeHero)}
                        >
                          <Info size={22} /> Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
            <div className="rows-scroller">
              {navCategory === "home" ? (
                <>
                  <MovieRow title="Top 10 Today" catKey="top10" isTop10 />
                  <MovieRow title="Recently Added" catKey="recent" />
                  <MovieRow title="Action Blockbusters" catKey="action" />
                </>
              ) : navCategory === "movies" ? (
                <>
                  <MovieRow title="Top 10 Movies" catKey="top10" mustInclude="movies" isTop10 />
                  <MovieRow title="Recently Released" catKey="recent" />
                  <MovieRow title="Comedy Blockbusters" catKey="comedy" />
                  <MovieRow title="Action Packed" catKey="action" />
                  <MovieRow title="Romance & Heart" catKey="romance" />
                  <MovieRow title="Crime Thrillers" catKey="thriller" />
                  <MovieRow title="Re-Released Classics" catKey="rerelease" />
                </>
              ) : (
                <>
                  <MovieRow
                    title={`${navCategory.toUpperCase()} TOP 10`}
                    catKey="top10"
                    mustInclude={navCategory}
                    isTop10
                  />
                  <div className="grid-view-container">
                    <header className="category-section-header">
                      <div className="cat-brand-pill">
                        TamilMob {navCategory.toUpperCase()}
                      </div>
                      <h2>All {navCategory.replace("movies", "")}</h2>
                    </header>
                    <div className="responsive-grid">
                      {adminMovies
                        .filter((m) => {
                          const target = navCategory.toLowerCase();
                          if (target === "movies") return true;
                          if (!m.categories) return false;
                          if (target === "cartoons") {
                            return m.categories.some(
                              (c) =>
                                c.toLowerCase() === "cartoon" ||
                                c.toLowerCase() === "cartoons",
                            );
                          }
                          return m.categories.some(
                            (c) => c.toLowerCase() === target,
                          );
                        })
                        .map((m, i) => (
                          <MovieCard key={m.title + i} movie={m} />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentView === "search-page" && (
          <div className="search-view-container">
            <header>
              <h2>
                {searchQuery ? `Results for "${searchQuery}"` : "Discover"}
              </h2>
            </header>
            <div className="responsive-grid">
              {filteredMovies.map((m, i) => (
                <MovieCard key={m.title + i} movie={m} />
              ))}
            </div>
          </div>
        )}

        {currentView === "admin-dashboard" && isAdminLoggedIn && (
          <div className="admin-dashboard-view">
            <div className="admin-header-prime">
              <div className="admin-title-group">
                <p>Management Portal</p>
                <h2>Console 2.0</h2>
              </div>
              <div className="admin-header-actions">
                <div className="sync-status">
                  <div className="pulse-dot"></div>
                  {isSyncing ? "SYNCING..." : "CLOUD CONNECTED"}
                </div>
                <button className="btn-exit-console" onClick={handleLogOut}>
                  <ArrowLeft size={16} /> Exit Console
                </button>
              </div>
            </div>

            <div className="admin-stats-grid">
              <div className="stat-card-mini animate-hover">
                <div className="stat-card-header">
                  <span className="lab">Total Library</span>
                  <Cloud size={20} className="text-cyan-400" />
                </div>
                <span className="val">{adminMovies.length}</span>
              </div>
              <div className="stat-card-mini animate-hover">
                <div className="stat-card-header">
                  <span className="lab">Top 10 Spots</span>
                  <TrendingUp size={20} className="text-amber-400" />
                </div>
                <span className="val">
                  {
                    adminMovies.filter((m) => m.categories?.includes("top10"))
                      .length
                  }
                  /10
                </span>
              </div>
              <div className="stat-card-mini animate-hover">
                <div className="stat-card-header">
                  <span className="lab">Movies</span>
                  <Film size={20} className="text-red-500" />
                </div>
                <span className="val">
                  {adminMovies.filter((m) => m.categories?.includes("movies")).length}
                </span>
              </div>
              <div className="stat-card-mini animate-hover">
                <div className="stat-card-header">
                  <span className="lab">Series</span>
                  <Tv size={20} className="text-violet-400" />
                </div>
                <span className="val">
                  {adminMovies.filter((m) => m.categories?.includes("webseries")).length}
                </span>
              </div>
              <div className="stat-card-mini animate-hover">
                <div className="stat-card-header">
                  <span className="lab">Anime</span>
                  <Sparkles size={20} className="text-green-400" />
                </div>
                <span className="val">
                  {adminMovies.filter((m) => m.categories?.includes("anime")).length}
                </span>
              </div>
            </div>

            <div className="admin-main-control">
              <div className="admin-glass-card">
                <div className="admin-form-premium">
                  <h3>{isEditing ? "Edit Movie" : "New Publication"}</h3>
                  <div className="input-box-modern">
                    <label>Featured Title</label>
                    <input
                      value={newMovie.title}
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, title: e.target.value })
                      }
                      placeholder="Enter movie title"
                    />
                  </div>
                  <div className="input-box-modern">
                    <label>Description</label>
                    <textarea
                      rows="3"
                      value={newMovie.description}
                      onChange={(e) =>
                        setNewMovie({
                          ...newMovie,
                          description: e.target.value,
                        })
                      }
                      placeholder="Write brief description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-box-modern">
                      <label>Year</label>
                      <input
                        value={newMovie.year}
                        onChange={(e) =>
                          setNewMovie({ ...newMovie, year: e.target.value })
                        }
                      />
                    </div>
                    <div className="input-box-modern">
                      <label>Rank</label>
                      <input
                        type="number"
                        value={newMovie.rank}
                        onChange={(e) =>
                          setNewMovie({
                            ...newMovie,
                            rank: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-box-modern">
                      <label>Quality</label>
                      <input
                        value={newMovie.quality}
                        onChange={(e) =>
                          setNewMovie({ ...newMovie, quality: e.target.value })
                        }
                        placeholder="e.g. HD, 4K UHD"
                      />
                    </div>
                    <div className="input-box-modern">
                      <label>Rating</label>
                      <input
                        value={newMovie.rating}
                        onChange={(e) =>
                          setNewMovie({ ...newMovie, rating: e.target.value })
                        }
                        placeholder="e.g. 98%"
                      />
                    </div>
                  </div>
                  <div className="input-box-modern">
                    <label>Poster Image</label>
                    <div className="custom-file-dropzone">
                      <Plus size={24} className="dropzone-icon" />
                      <span>Choose Poster</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            compressImage(file, 400, (compressedBase64) => {
                              setNewMovie((prev) => ({ ...prev, image: compressedBase64 }));
                            });
                          }
                        }}
                      />
                    </div>
                    {newMovie.image && (
                      <div className="preview-container-admin">
                        <img
                          src={getImgSrc(newMovie.image)}
                          alt="preview"
                          className="admin-img-preview"
                        />
                        <button type="button" className="btn-remove-preview" onClick={() => setNewMovie(prev => ({ ...prev, image: "" }))}>
                          <X size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="input-box-modern">
                    <label>Landscape Image</label>
                    <div className="custom-file-dropzone">
                      <Plus size={24} className="dropzone-icon" />
                      <span>Choose Landscape</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            compressImage(file, 800, (compressedBase64) => {
                              setNewMovie((prev) => ({ ...prev, landscape_image: compressedBase64 }));
                            });
                          }
                        }}
                      />
                    </div>
                    {newMovie.landscape_image && (
                      <div className="preview-container-admin">
                        <img
                          src={getImgSrc(newMovie.landscape_image)}
                          alt="preview"
                          className="admin-img-preview"
                        />
                        <button type="button" className="btn-remove-preview" onClick={() => setNewMovie(prev => ({ ...prev, landscape_image: "" }))}>
                          <X size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="input-box-modern">
                    <label>Telegram Link</label>
                    <input
                      value={newMovie.telegramLink}
                      onChange={(e) =>
                        setNewMovie({
                          ...newMovie,
                          telegramLink: e.target.value,
                        })
                      }
                      placeholder="https://t.me/yourchannel"
                    />
                  </div>
                  <div className="cat-picker">
                    <p className="font-bold opacity-90 mb-3">
                      Assign Categories
                    </p>
                    <div className="admin-category-pill-grid">
                      {categories.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className={`admin-cat-pill ${newMovie.categories.includes(c.key) ? "active" : ""}`}
                          onClick={() => {
                            const cats = newMovie.categories.includes(c.key)
                              ? newMovie.categories.filter((x) => x !== c.key)
                              : [...newMovie.categories, c.key];
                            setNewMovie({ ...newMovie, categories: cats });
                          }}
                        >
                          <span className="cat-text">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button className="btn-add-cloud" onClick={handleAddMovie}>
                      <Cloud size={18} />
                      <span>
                        {isEditing ? "Update Server" : "Publish to Cloud"}
                      </span>
                    </button>
                    <button
                      className="btn-reset-form"
                      type="button"
                      onClick={handleResetForm}
                    >
                      <RefreshCw size={16} />
                      <span>{isEditing ? "Cancel" : "Clear"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-glass-card library-card">
                <div className="library-header-premium">
                  <h3>Library Overview</h3>
                  <div className="library-controls-grid">
                    <div className="admin-search-wrapper">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search publications..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                      />
                      {adminSearchQuery && (
                        <button className="clear-search-btn" onClick={() => setAdminSearchQuery("")}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    
                    <div className="admin-filter-wrapper">
                      <select
                        value={adminCategoryFilter}
                        onChange={(e) => setAdminCategoryFilter(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="admin-visual-list mt-6">
                  {filteredAdminMovies.length === 0 ? (
                    <div className="admin-no-results">
                      <Info size={36} />
                      <p>No publications match your search criteria.</p>
                    </div>
                  ) : (
                    filteredAdminMovies.map((m) => (
                      <div className="admin-movie-row" key={m.title}>
                        <div className="row-left-thumb">
                          <img src={getImgSrc(m.image)} alt="" />
                          <div className="row-info-text">
                            <h4>{m.title}</h4>
                            <p>{m.categories?.join(" • ") || "No Category"}</p>
                          </div>
                        </div>
                        <div className="row-actions-btn">
                          <button
                            className="btn-icon-admin edit"
                            onClick={() => {
                              setNewMovie(m);
                              setIsEditing(m.title);
                              window.scrollTo(0, 0);
                            }}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="btn-icon-admin del"
                            onClick={() => deleteMovie(m.title)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "movie-details" && selectedMovie && (
          <div className="movie-details-page">
            <div
              className="md-hero-box"
              style={{
                backgroundImage: `url('${(window.innerWidth > 768 && selectedMovie.landscape_image) ? (selectedMovie.landscape_image.startsWith('data:') ? selectedMovie.landscape_image : 'images/landscape/' + selectedMovie.landscape_image) : getImgSrc(selectedMovie.image)}')`,
              }}
            >
              <div className="md-hero-gradient"></div>
              <button className="md-back-btn" onClick={closeMovieDetails}>
                <ArrowLeft size={18} /> Back
              </button>
              <div className="md-hero-info">
                <div className="md-tagline">
                  <span className="md-exclusive">TAMILMOB EXCLUSIVE</span>
                  <span className="md-top-rated">
                    <BarChart3 size={14} /> Trending #
                    {featuredMovies.findIndex(
                      (m) => m.title === selectedMovie.title,
                    ) + 1 || "1"}
                  </span>
                </div>
                <h2 className="md-title">{selectedMovie.title}</h2>
                <div className="md-flex-wrap">
                  <span className="md-badge-match">98% Match</span>
                  <span className="md-badge-outline">{selectedMovie.year}</span>
                  <span className="md-badge-outline">
                    {selectedMovie.quality}
                  </span>
                  <span className="md-badge-fill">AD-FREE</span>
                </div>
              </div>
            </div>
            <div className="md-content">
              <div className="md-grid">
                <div className="md-storyline">
                  <h3>Storyline</h3>
                  <p className="md-story-text">
                    {selectedMovie.description ||
                      "An epic journey into the cinematic world of TamilMob. High-speed action meets deep narrative in this blockbuster release."}
                  </p>
                  <div className="md-action-btns">
                    <a
                      href={selectedMovie.telegramLink}
                      target="_blank"
                      className="md-btn-play"
                    >
                      <Send size={20} style={{ marginRight: "8px" }} /> Join Our
                      Channel
                    </a>
                    <button className="md-btn-icon" onClick={handleShare}>
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="md-download-panel">
                  <div className="md-trim"></div>
                  <h3 className="md-dl-title">
                    <Download size={22} className="mr-3" /> Cloud Servers
                  </h3>
                  <div className="md-dl-list">
                    <a
                      href={selectedMovie.telegramLink}
                      target="_blank"
                      className="md-dl-card sd"
                    >
                      <div className="md-dl-left">
                        <span className="md-dl-label">Normal Quality</span>
                        <span className="md-dl-size">Server 1 - Fast</span>
                      </div>
                      <div className="md-dl-icon">
                        <ChevronRight />
                      </div>
                    </a>
                    <a
                      href={selectedMovie.telegramLink}
                      target="_blank"
                      className="md-dl-card hd"
                    >
                      <div className="md-dl-left">
                        <span className="md-dl-label">Dual Audio HD</span>
                        <span className="md-dl-size">Server 2 - Fast</span>
                      </div>
                      <div className="md-dl-icon">
                        <ChevronRight />
                      </div>
                    </a>
                    <a
                      href={selectedMovie.telegramLink}
                      target="_blank"
                      className="md-dl-card uhd"
                    >
                      <div className="md-dl-left">
                        <span className="md-dl-label">Original 4K UHD</span>
                        <span className="md-dl-size">
                          Premium Server - Max Speed
                        </span>
                      </div>
                      <div className="md-dl-icon">
                        <Play fill="currentColor" size={16} />
                      </div>
                    </a>
                  </div>
                </div>

                <section className="md-rec-section">
                  <h3 className="md-rec-title">Recommended For You</h3>
                  <div className="md-rec-grid">
                    {randomRecommendations.map((m, i) => (
                      <div
                        key={m.title + i}
                        className="md-rec-card"
                        onClick={() => openMovieDetails(m)}
                      >
                        <img src={`images/${m.image}`} alt={m.title} />
                        <div className="md-rec-overlay">
                          <div className="md-rec-play">
                            <Play fill="white" size={18} />
                          </div>
                          <span className="md-rec-label">{m.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showLoginChoices && (
          <div
            className="login-popover-backdrop"
            onClick={() => setShowLoginChoices(false)}
          >
            <div
              className="login-choice-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="choice-buttons">
                <h3>Cinema Portal</h3>
                <button
                  className="c-btn-ai"
                  onClick={() => {
                    setShowAIChat(true);
                    setShowLoginChoices(false);
                  }}
                >
                  <Bot /> Movie AI Assistant
                </button>
                <button
                  className="c-btn-admin"
                  onClick={() => showView("admin-login", "admin")}
                >
                  <Award /> Administrator Console
                </button>
                <button
                  className="c-btn-user"
                  onClick={() => showView("home-page", "home")}
                >
                  <Home /> Return to Cinema
                </button>
              </div>
            </div>
          </div>
        )}

        {showAIChat && (
          <div className="ai-chat-overlay">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="ai-chat-window"
            >
              <div className="ai-chat-header">
                <div className="flex items-center">
                  <Bot className="text-cyan-400 mr-2" />
                  <div>
                    <h3>TamilMob AI</h3>
                    <p>Powered by TamilMob</p>
                  </div>
                </div>
                <button
                  className="ai-close-btn"
                  onClick={() => setShowAIChat(false)}
                >
                  <X />
                </button>
              </div>

              <div className="ai-chat-body">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`ai-message ${msg.role}`}>
                    {msg.role === "bot" && (
                      <div className="bot-avatar">
                        <Bot size={16} />
                      </div>
                    )}
                    <div className="message-bubble">{msg.content}</div>
                  </div>
                ))}
              </div>

              <form className="ai-chat-footer" onSubmit={handleAISend}>
                <input
                  type="text"
                  placeholder="Ask for a movie link..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit">
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED BOTTOM NAVIGATION BAR */}
      {currentView !== "admin-dashboard" && currentView !== "admin-login" && (
        <footer className="bottom-nav">
          <div
            className={`nav-item ${navCategory === "home" ? "active" : ""}`}
            onClick={() => showView("home-page", "home")}
          >
            <Home />
            <span>Home</span>
          </div>
          <div
            className={`nav-item ${navCategory === "movies" ? "active" : ""}`}
            onClick={() => showView("home-page", "movies")}
          >
            <Film />
            <span>Movies</span>
          </div>
          <div
            className={`nav-item ${navCategory === "kdrama" ? "active" : ""}`}
            onClick={() => showView("home-page", "kdrama")}
          >
            <Languages />
            <span>K-Drama</span>
          </div>
          <div
            className="nav-item sk-logo-btn"
            onClick={() => setShowLoginChoices(true)}
          >
            <div className="sk-inner-disc">
              <img src="tamil_mob_logo.png" alt="TamilMob Logo" className="sk-logo-image" />
            </div>
          </div>
          <div
            className={`nav-item ${navCategory === "anime" ? "active" : ""}`}
            onClick={() => showView("home-page", "anime")}
          >
            <Sparkles />
            <span>Anime</span>
          </div>
          <div
            className={`nav-item ${navCategory === "cartoons" ? "active" : ""}`}
            onClick={() => showView("home-page", "cartoons")}
          >
            <Baby size={20} />
            <span>Cartoon</span>
          </div>
          <div
            className={`nav-item ${navCategory === "webseries" ? "active" : ""}`}
            onClick={() => showView("home-page", "webseries")}
          >
            <Tv />
            <span>Series</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
