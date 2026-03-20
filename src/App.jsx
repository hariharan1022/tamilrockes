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
  User, // Added User icon
  LogOut, // Added LogOut icon
} from "lucide-react";
import { supabase } from "./config/supabase";
import { movies as initialLocalMovies, categories } from "./data/movies";
import "./index.css";

function App() {
  const [currentView, setCurrentView] = useState("home-page");
  const [navCategory, setNavCategory] = useState("home");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [session, setSession] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  // Admin Side State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginChoices, setShowLoginChoices] = useState(false); // Used for SK Footer Portal
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I am your SK AI Movie Bot. 🎥 Just type a movie name, and I will find the link for you or explain why it's not available!",
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
    telegram_link: "",
    categories: [],
    rank: 0,
    year: "2025",
    quality: "HD",
    rating: "98%",
    landscape_image: "",
  });

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

    // Check auth session
    supabase.auth.getSession().then(({ data: { session: curSession } }) => {
      setSession(curSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, curSession) => {
      setSession(curSession);
    });

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (isReg) => {
    if (!loginEmail || !loginPass) return alert("Please fill all fields.");
    if (isReg) {
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPass,
      });
      if (error) {
        alert("Registration Error: " + error.message);
      } else {
        if (data?.session) {
          alert("Registration successful! You are now logged in.");
        } else {
          alert(
            "Registration successful! IMPORTANT: Please check your email inbox (and spam) to confirm your account before logging in.",
          );
          setShowRegister(false);
          setLoginPass("");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPass,
      });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
           alert("Login Failed: Your email address hasn't been confirmed yet. Please check your inbox for the verification link.");
        } else {
           alert("Login Error: " + error.message);
        }
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

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

  const randomRecommendations = useMemo(() => {
    if (!adminMovies.length) return [];
    return [...adminMovies]
      .filter((m) => m.title !== selectedMovie?.title)
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
  }, [adminMovies, selectedMovie]);

  const handleShare = () => {
    const shareData = {
      title: selectedMovie?.title || "SK MOVIES",
      text: `Watch ${selectedMovie?.title || ""} on SK MOVIES!`,
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
          "This movie is still exclusive to theaters. Stay tuned for the digital debut on SK!",
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
    if (adminUser.user === "admin" && adminUser.pass === "admin") {
      setIsAdminLoggedIn(true);
      showView("admin-dashboard", "admin");
    } else alert("Invalid Credentials!");
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

  const syncLocalToCloud = async () => {
    if (!window.confirm("Push all movies from local backup file to Cloud?"))
      return;
    setIsSyncing(true);
    let successCount = 0;
    for (const m of initialLocalMovies) {
      const { error } = await supabase
        .from("movies")
        .upsert(m, { onConflict: "title" });
      if (!error) successCount++;
    }
    alert(`Successfully synced ${successCount} movies to Cloud!`);
    fetchMovies();
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
      whileHover={{ scale: 1.04, y: -4, zIndex: 50 }}
      whileTap={{ scale: 0.96 }}
      layout
      onClick={() => openMovieDetails(movie)}
    >
      <div className="rank-wrapper">
        <div className="poster-container shadow-sm">
          {isTop10 && <span className="rank-digit">{rank}</span>}
          <img loading="lazy" src={`images/${movie.image}`} alt={movie.title} />
          <div className="poster-overlay">
            <div className="poster-overlay-play">
              <Play fill="white" size={24} style={{ marginLeft: "4px" }} />
            </div>
          </div>
        </div>
        <p className="poster-title-overlap">{movie.title}</p>
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
        <div className="relative group">
          <button
            className="row-arrow left"
            onClick={() =>
              listRef.current?.scrollBy({ left: -400, behavior: "smooth" })
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
              listRef.current?.scrollBy({ left: 400, behavior: "smooth" })
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
        <div className="admin-login-card">
          <h2>Admin Terminal</h2>
          <div className="admin-login-form">
            <input
              type="text"
              placeholder="Access Key"
              onChange={(e) =>
                setAdminUser({ ...adminUser, user: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Password"
              onChange={(e) =>
                setAdminUser({ ...adminUser, pass: e.target.value })
              }
            />
            <button onClick={loginAdmin}>Enter Console</button>
            <button
              className="btn-back-to-user"
              onClick={() => setCurrentView("home-page")}
            >
              Return to User Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-full-screen">
        <div className="login-bg-overlay"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="login-card-prime"
        >
          <div className="login-logo-brand">
            SK<span>CINEMA</span>
          </div>
          <h2>{showRegister ? "Create Account" : "Access Portal"}</h2>
          <p>The Ultimate Cinematic Experience Awaits</p>

          <div className="login-form-group">
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="input-with-icon">
              <LogOut size={18} />
              <input
                type="password"
                placeholder="Secure Password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>

            <button
              className="login-submit-btn"
              onClick={() => handleAuth(showRegister)}
            >
              {showRegister ? "Register Now" : "Unlock Cinematic Access"}
            </button>
          </div>

          <div className="login-switcher">
            {showRegister ? (
              <p>
                Already have an account?{" "}
                <span onClick={() => setShowRegister(false)}>Log In</span>
              </p>
            ) : (
              <p>
                Don't have an access key?{" "}
                <span onClick={() => setShowRegister(true)}>Get Started</span>
              </p>
            )}
            <p
              className="admin-access-link"
              onClick={() => setCurrentView("admin-login")}
            >
              Administrator Access
            </p>
          </div>
        </motion.div>
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
            <motion.h1
              className="site-logo"
              whileTap={{ scale: 0.9 }}
              onClick={() => showView("home-page", "home")}
            >
              SK<span>MOVIES</span>
            </motion.h1>
          </div>
          <div className="navbar-actions">
            <div className={`expanded-search ${isSearching ? "open" : ""}`}>
              <Search
                size={22}
                className="s-icon"
                onClick={() => showView("search-page", "search")}
              />
              {isSearching && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              )}
            </div>
            <div
              className="navbar-profile"
              onClick={() => setShowUserProfile(true)}
            >
              <div className="profile-disc shadow-sm">
                <span className="profile-initial">
                  {session?.user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-viewport">
        {currentView === "home-page" && (
          <div className="home-view">
            {currentView === "home-page" && (
              <div className="hero-top-nav">
                <button
                  className={`pill ${navCategory === "home" ? "active" : ""}`}
                  onClick={() => showView("home-page", "home")}
                >
                  Home
                </button>
                <button
                  className={`pill ${navCategory === "movies" ? "active" : ""}`}
                  onClick={() => showView("home-page", "movies")}
                >
                  Movies
                </button>
                <button
                  className={`pill ${navCategory === "kdrama" ? "active" : ""}`}
                  onClick={() => showView("home-page", "kdrama")}
                >
                  K-Drama
                </button>
                <button
                  className={`pill ${navCategory === "anime" ? "active" : ""}`}
                  onClick={() => showView("home-page", "anime")}
                >
                  Anime
                </button>
                <button
                  className={`pill ${navCategory === "webseries" ? "active" : ""}`}
                  onClick={() => showView("home-page", "webseries")}
                >
                  Series
                </button>
              </div>
            )}
            {activeHero && (
              <section className="hero-landing">
                <div
                  className="hero-main-card"
                  style={{
                    backgroundImage: `url("${(window.innerWidth > 768 && activeHero.landscape_image) ? "images/landscape/" + activeHero.landscape_image : "images/" + activeHero.image}")`,
                  }}
                >
                  <div className="hero-gradient-overlay">
                    <div className="hero-content">
                      <div className="brand-logo-netflix">SK MOVIES</div>
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
                          <Play fill="currentColor" size={22} /> Play
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
            <div
              className="rows-scroller"
              style={!activeHero ? { paddingTop: "100px" } : undefined}
            >
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
                        SK {navCategory.toUpperCase()}
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

        {currentView === "admin-login" && (
          <div className="admin-login-container">
            <div className="login-box">
              <h2>System Login</h2>
              <input
                placeholder="Username"
                onChange={(e) =>
                  setAdminUser({ ...adminUser, user: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                onChange={(e) =>
                  setAdminUser({ ...adminUser, pass: e.target.value })
                }
              />
              <button onClick={loginAdmin}>Enter Console</button>
            </div>
          </div>
        )}

        {currentView === "admin-dashboard" && isAdminLoggedIn && (
          <div className="admin-dashboard-view">
            <div className="admin-header-prime">
              <div className="admin-title-group">
                <p>Management</p>
                <h2>Console 2.0</h2>
              </div>
              <div className="sync-status">
                <div className="pulse-dot"></div>
                {isSyncing ? "SYNCING..." : "CLOUD CONNECTED"}
              </div>
            </div>

            <div className="admin-stats-grid">
              <div className="stat-card-mini">
                <span className="lab">Total Library</span>
                <span className="val">{adminMovies.length}</span>
              </div>
              <div className="stat-card-mini">
                <span className="lab">Top 10 Spots</span>
                <span className="val">
                  {
                    adminMovies.filter((m) => m.categories?.includes("top10"))
                      .length
                  }
                  /10
                </span>
              </div>
              <div className="stat-card-mini">
                <span className="lab">Actions</span>
                <button className="pill" onClick={syncLocalToCloud}>
                  <RefreshCw size={14} /> Import Local Data
                </button>
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
                            rank: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="input-box-modern">
                    <label>Poster Filename (e.g. m1.jpg)</label>
                    <input
                      value={newMovie.image}
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, image: e.target.value })
                      }
                    />
                  </div>
                  <div className="input-box-modern">
                    <label>Landscape Filename (Laptop Hero - e.g. m1-wide.jpg)</label>
                    <input
                      value={newMovie.landscape_image}
                      onChange={(e) =>
                        setNewMovie({ ...newMovie, landscape_image: e.target.value })
                      }
                    />
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
                    {isEditing && (
                      <button
                        className="btn-cancel"
                        onClick={() => setIsEditing(null)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-glass-card">
                <h3>Library Overview</h3>
                <div className="admin-visual-list mt-6">
                  {adminMovies.map((m) => (
                    <div className="admin-movie-row" key={m.title}>
                      <div className="row-left-thumb">
                        <img src={`images/${m.image}`} alt="" />
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
                  ))}
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
                backgroundImage: `url('images/${selectedMovie.image}')`,
              }}
            >
              <div className="md-hero-gradient"></div>
              <button className="md-back-btn" onClick={closeMovieDetails}>
                <ArrowLeft size={18} /> Back
              </button>
              <div className="md-hero-info">
                <div className="md-tagline">
                  <span className="md-exclusive">SK EXCLUSIVE</span>
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
                      "An epic journey into the cinematic world of SK. High-speed action meets deep narrative in this blockbuster release."}
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
        {showUserProfile && (
          <div
            className="login-popover-backdrop"
            onClick={() => setShowUserProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="user-profile-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="profile-header-premium">
                <div className="profile-avatar-large">
                  {session?.user?.email?.charAt(0).toUpperCase()}
                </div>
                <h3>User Profile</h3>
                <p>{session?.user?.email}</p>
              </div>
              <div className="profile-detail-list">
                <div className="detail-item">
                  <span className="label">Account ID</span>
                  <span className="value">
                    {session?.user?.id?.slice(0, 12)}...
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span className="value text-green-400">Verified User</span>
                </div>
              </div>
              <button
                className="c-btn-logout-alt"
                onClick={() => {
                  handleLogout();
                  setShowUserProfile(false);
                }}
              >
                <LogOut size={16} /> Sign Out Account
              </button>
            </motion.div>
          </div>
        )}

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
                    <h3>SK MOVIE AI</h3>
                    <p>Powered by SK Cinema</p>
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
              <span className="sk-logo-text">SK</span>
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
