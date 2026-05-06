import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [feed, setFeed] = useState([]);
  const [history, setHistory] = useState([]);
  const [myTips, setMyTips] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentView, setCurrentView] = useState("home"); // home, history, profile, my-tips
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [tipText, setTipText] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [filterCharacter, setFilterCharacter] = useState("all");
  const [isSubmittingTip, setIsSubmittingTip] = useState(false);

  const currentViewRef = useRef(currentView);
  const filterCharacterRef = useRef(filterCharacter);
  
  // Form states
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: ""
  });
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: ""
  });

  const characters = ["Serena", "Blair", "Nate", "Chuck", "Dan", "Vanessa", "Jenny"];

  const fetchFeed = () => {
    fetch("http://localhost:8000/feed")
      .then(res => res.json())
      .then(data => setFeed(data))
      .catch(console.error);
  };

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    filterCharacterRef.current = filterCharacter;
  }, [filterCharacter]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time blast updates
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/stream");

    eventSource.onmessage = (event) => {
      const newBlast = JSON.parse(event.data);

      // Only update if this is actually a new blast (different from current)
      setFeed(currentFeed => {
        if (currentFeed.length === 0 || currentFeed[0].id !== newBlast.id) {
          return [newBlast];
        }
        return currentFeed;
      });

      // Also update history if user is on that page
      if (currentViewRef.current === "history") {
        const url = filterCharacterRef.current === "all"
          ? "http://localhost:8000/history"
          : `http://localhost:8000/history?character=${filterCharacterRef.current}`;

        fetch(url)
          .then(res => res.json())
          .then(data => setHistory(data))
          .catch(console.error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (currentView === "home") {
      fetchFeed();
    } else if (currentView === "history") {
      const url = filterCharacter === "all" 
        ? "http://localhost:8000/history"
        : `http://localhost:8000/history?character=${filterCharacter}`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          setHistory(data);
        })
        .catch(console.error);
    } else if (currentView === "my-tips") {
      fetchMyTips();
    }
  }, [currentView, filterCharacter]);

  const fetchMyTips = () => {
    if (!token) return;

    fetch("http://localhost:8000/my-tips", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setMyTips(data);
      })
      .catch(console.error);
  };

  const fetchHistory = () => {
    const url = filterCharacter === "all" 
      ? "http://localhost:8000/history"
      : `http://localhost:8000/history?character=${filterCharacter}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setHistory(data);
      })
      .catch(console.error);
  };

  const handleLogin = () => {
    if (!loginUsername.trim() || !loginPassword.trim()) return;
    
    fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUsername,
        password: loginPassword
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.access_token) {
        setToken(data.access_token);
        // Get user info with token
        fetch("http://localhost:8000/auth/me", {
          headers: {
            "Authorization": `Bearer ${data.access_token}`
          }
        })
        .then(res => res.json())
        .then(userData => {
          setUser(userData);
          setProfileData({
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            password: ""
          });
        });
        setShowLoginModal(false);
        setLoginUsername("");
        setLoginPassword("");
      } else {
        alert("Invalid credentials");
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      alert("Login failed");
    });
  };

  const handleSignup = () => {
    if (!signupData.username || !signupData.email || !signupData.first_name || !signupData.last_name || !signupData.password) {
      alert("Please fill all fields");
      return;
    }

    fetch("http://localhost:8000/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData)
    })
    .then(res => {
      return res.json();
    })
    .then(data => {
      if (data.id) {
        setUser(data);
        setProfileData({
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          password: ""
        });
        setShowSignupModal(false);
        setSignupData({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          password: ""
        });
      } else {
        alert(data.detail || "Signup failed");
      }
    })
    .catch(err => {
      console.error("Signup error:", err);
      alert("Signup failed");
    });
  };

  const getCharacterClass = (character) => {
    // Map old full names to new short names for CSS classes
    const characterMap = {
      "Serena van der Woodsen": "serena",
      "Blair Waldorf": "blair", 
      "Chuck Bass": "chuck",
      "Nate Archibald": "nate",
      "Dan Humphrey": "dan",
      "Vanessa Abrams": "vanessa",
      "Jenny Humphrey": "jenny"
    };
    
    // Return mapped name or convert the character name directly
    const mappedName = characterMap[character] || character.toLowerCase().replace(' ', '-');
    return mappedName;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setShowChatbot(false);
    setCurrentView("home");
  };

  const handleUpdateProfile = () => {
    if (!user || !token) return;

    fetch(`http://localhost:8000/auth/me`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.id) {
        setUser(data);
        setShowProfileModal(false);
        alert("Profile updated successfully");
      } else {
        alert(data.detail || "Update failed");
      }
    })
    .catch(err => {
      console.error("Update error:", err);
      alert("Update failed");
    });
  };

  const startChatbot = () => {
    setShowChatbot(true);
    setChatMessages([
      { type: "bot", text: "Who would you like to send a tip about?" }
    ]);
    setSelectedCharacter("");
    setTipText("");
    setIsSubmittingTip(false);
  };

  const handleCharacterSelection = (character) => {
    setSelectedCharacter(character);
    setChatMessages(prev => [
      ...prev,
      { type: "user", text: character },
      { type: "bot", text: `What's the gossip about ${character}?` }
    ]);
  };

  const submitTip = () => {
    if (!user) {
      setChatMessages(prev => [
        ...prev,
        { type: "bot", text: "You need to be logged in to send a tip." }
      ]);
      return;
    }

    if (!selectedCharacter) {
      setChatMessages(prev => [
        ...prev,
        { type: "bot", text: "Pick who this tip is about first." }
      ]);
      return;
    }

    if (!tipText.trim()) {
      setChatMessages(prev => [
        ...prev,
        { type: "bot", text: "Type your tip first, then press Send Tip." }
      ]);
      return;
    }

    if (isSubmittingTip) return;

    setIsSubmittingTip(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    fetch("http://localhost:8000/submit-tip", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        character: selectedCharacter,
        tip: tipText
      }),
      signal: controller.signal
    })
    .then(res => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error("Tip submission failed");
      }
      return res.json();
    })
    .then(data => {
      if (data?.tip && user && data.tip.user_id === user.id) {
        setMyTips(prev => [data.tip, ...prev]);
      }

      // Handle immediate blast response
      if (data?.blast) {
        setFeed([data.blast]);

        if (currentViewRef.current === "history") {
          setHistory(prev => {
            if (prev.some(p => p.id === data.blast.id)) return prev;
            return [data.blast, ...prev];
          });
        }
      }

      setChatMessages(prev => [
        ...prev,
        { type: "user", text: tipText },
        { type: "bot", text: "Your tip has been successfully sent." }
      ]);
      setTipText("");
      setSelectedCharacter("");
      setChatMessages(prev => [
        ...prev,
        { type: "bot", text: "Want to send another? Choose another person." }
      ]);

      fetchMyTips();
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.error("Tip submission error:", err);
      if (err.name === 'AbortError') {
        setChatMessages(prev => [
          ...prev,
          { type: "bot", text: "The AI is taking longer than expected to generate your blast. Your tip was likely submitted successfully - check the feed in a moment!" }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: "bot", text: "Something went wrong sending that tip. Try again." }
        ]);
      }
    })
    .finally(() => {
      setIsSubmittingTip(false);
    });
  };

  return (
    <div className="app-container">
      <header className="gossip-header">
        <h1 className="site-title">gossip girl</h1>
      </header>

      <div className="main-layout">
        <div className="left-content">
          <div className="side-card">
            <h3 className="welcome-title">welcome</h3>
            <p>to Gossip Girl! The Site ABOUT the Upper East Side, home FOR the Upper East Side and BY the Upper East Side!</p>
          </div>
          <div className="side-card">
            <h3 className="gossip-title">gossip</h3>
            <p>The latest "411" on all the in people.</p>
          </div>
        </div>

        <div className="content-area">
          {currentView === "home" && (
            <div className="gossip-girl-app">
              <div className="feed-header">
                <h2>{feed.length ? feed[0].title : "Gossip"}</h2>
              </div>

              <div className="feed">
                {feed.map(post => (
                  <article key={post.id} className="gossip-post">
                    <div className={`character-image ${getCharacterClass(post.character)}`}>
                      <img src={post.image} alt={post.character} />
                    </div>
                    <p>{post.content}</p>
                  </article>
                ))}
              </div>

              <span className="signature">xoxo GOSSIP GIRL</span>
            </div>
          )}

          {currentView === "history" && (
            <div className="history-page">
              <div className="filter-section">
                <label>Filter:</label>
                <select value={filterCharacter} onChange={(e) => setFilterCharacter(e.target.value)}>
                  <option value="all">Everyone</option>
                  {characters.map(char => (
                    <option key={char} value={char}>{char}</option>
                  ))}
                </select>
              </div>
              <div className="history-cards">
                {history.map(post => (
                  <div key={post.id} className="gossip-girl-app">
                    <div className="feed-header">
                      <h2>{post.title}</h2>
                    </div>

                    <div className="feed">
                      <article className="gossip-post">
                        <div className={`character-image ${getCharacterClass(post.character)}`}>
                          <img src={post.image} alt={post.character} />
                        </div>
                        <p>{post.content}</p>
                      </article>
                    </div>

                    <span className="signature">xoxo GOSSIP GIRL</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "my-tips" && (
            <div className="my-tips-page">
              <div className="gossip-girl-app">
                <div className="feed-header">
                  <h2>My Tips</h2>
                </div>
                <div className="tips-list">
                  {myTips.length > 0 ? (
                    myTips.map(tip => (
                      <div key={tip.id} className="gossip-girl-app">
                        <div className="feed-header">
                          <h2>Tip About {tip.character}</h2>
                        </div>
                        <div className="tip-content">
                          <p>{tip.tip}</p>
                        </div>
                        <div className="tip-meta">
                          <small>Submitted: {new Date(tip.created_at).toLocaleDateString()}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-tips">
                      <p>You haven't submitted any tips yet!</p>
                      <button className="auth-btn" onClick={startChatbot}>Send Your First Tip</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="right-content" style={{ marginLeft: "2rem" }}>
          <div className="nav-buttons-right">
            <div className="auth-buttons">
              <button className="auth-btn circle-btn" onClick={() => setCurrentView("home")}>Home</button>
              <button className="auth-btn circle-btn" onClick={() => setCurrentView("history")}>History</button>
              {user ? (
                <>
                  <button className="auth-btn circle-btn tip-button-nav" onClick={startChatbot}>Send Tip</button>
                  <button className="auth-btn circle-btn" onClick={() => setCurrentView("my-tips")}>My Tips</button>
                  <button className="auth-btn circle-btn" onClick={() => setShowProfileModal(true)}>Profile</button>
                  <button className="auth-btn circle-btn" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <button className="auth-btn circle-btn" onClick={() => setShowLoginModal(true)}>Login</button>
                  <button className="auth-btn circle-btn" onClick={() => setShowSignupModal(true)}>Signup</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Modal */}
      {showChatbot && (
        <div className="chatbot-modal">
          <div className="chatbot-container">
            <div className="chatbot-header">
              <h3>Send a Tip</h3>
              <button className="close-btn" onClick={() => setShowChatbot(false)}>×</button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.type}`}>
                  {msg.text}
                </div>
              ))}
              {!selectedCharacter && (
                <div className="character-options">
                  {characters.map(char => (
                    <button 
                      key={char}
                      onClick={() => handleCharacterSelection(char)}
                      className="character-btn"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              )}
              {selectedCharacter && (
                <div className="tip-input-section">
                  <textarea
                    placeholder={`What's the gossip about ${selectedCharacter}?`}
                    value={tipText}
                    onChange={(e) => setTipText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        submitTip();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={submitTip}
                    className="submit-tip-btn"
                    disabled={isSubmittingTip}
                  >
                    {isSubmittingTip ? "Sending..." : "Send Tip"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="login-modal">
            <h3>Login</h3>
            <input
              className="login-input"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <div className="login-actions">
              <button className="login-submit-btn" onClick={handleLogin}>Login</button>
              <button className="cancel-btn" onClick={() => setShowLoginModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay">
          <div className="signup-modal">
            <h3>Sign Up</h3>
            <input
              className="login-input"
              placeholder="Username"
              value={signupData.username}
              onChange={(e) => setSignupData({...signupData, username: e.target.value})}
            />
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={signupData.email}
              onChange={(e) => setSignupData({...signupData, email: e.target.value})}
            />
            <input
              className="login-input"
              placeholder="First Name"
              value={signupData.first_name}
              onChange={(e) => setSignupData({...signupData, first_name: e.target.value})}
            />
            <input
              className="login-input"
              placeholder="Last Name"
              value={signupData.last_name}
              onChange={(e) => setSignupData({...signupData, last_name: e.target.value})}
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={signupData.password}
              onChange={(e) => setSignupData({...signupData, password: e.target.value})}
            />
            <div className="login-actions">
              <button className="login-submit-btn" onClick={handleSignup}>Sign Up</button>
              <button className="cancel-btn" onClick={() => setShowSignupModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="profile-modal">
            <h3>Edit Profile</h3>
            <input
              className="login-input"
              placeholder="Username"
              value={profileData.username}
              onChange={(e) => setProfileData({...profileData, username: e.target.value})}
            />
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
            />
            <input
              className="login-input"
              placeholder="First Name"
              value={profileData.first_name}
              onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
            />
            <input
              className="login-input"
              placeholder="Last Name"
              value={profileData.last_name}
              onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
            />
            <input
              className="login-input"
              type="password"
              placeholder="New Password (leave blank to keep current)"
              value={profileData.password}
              onChange={(e) => setProfileData({...profileData, password: e.target.value})}
            />
            <div className="login-actions">
              <button className="login-submit-btn" onClick={handleUpdateProfile}>Update</button>
              <button className="cancel-btn" onClick={() => setShowProfileModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
