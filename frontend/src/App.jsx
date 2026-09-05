import { useEffect, useRef, useState } from "react";

import {
  Search,
  Bell,
  Plus,
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronRight,
  Star,
  Trash2,
  Activity,
  RefreshCw,
  X,
  BarChart3,
  Lightbulb,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

const API_URL = "https://marketpulse-64o8.onrender.com";

function App() {
  // =========================================================
  // STATE
  // =========================================================

  const [stocks, setStocks] = useState([]);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [attentionData, setAttentionData] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showAddStock, setShowAddStock] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [removingStock, setRemovingStock] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState("1D");
  const [selectedChartStock, setSelectedChartStock] = useState("");

  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const overviewRef = useRef(null);

  // =========================================================
  // LOAD WATCHLIST
  // =========================================================

  const loadWatchlist = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/api/watchlist`);

      if (!response.ok) {
        throw new Error("Failed to load watchlist");
      }

      const data = await response.json();

      setStocks(Array.isArray(data) ? data : []);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // =========================================================
  // LOAD AVAILABLE STOCKS
  // =========================================================

  const loadAvailableStocks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stocks`);

      if (!response.ok) {
        throw new Error("Failed to load stocks");
      }

      const data = await response.json();

      setAvailableStocks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load available stocks:", err);
    }
  };

  // =========================================================
  // LOAD ATTENTION DATA
  // =========================================================

  const loadAttention = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attention`);

      if (!response.ok) {
        throw new Error("Failed to load attention data");
      }

      const data = await response.json();

      setAttentionData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load attention:", err);
      setAttentionData([]);
    }
  };

  // =========================================================
  // REFRESH EVERYTHING
  // =========================================================

  const refreshData = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        loadWatchlist(false),
        loadAvailableStocks(),
        loadAttention(),
      ]);

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadWatchlist();
    loadAvailableStocks();
    loadAttention();
  }, []);

  // =========================================================
  // DEFAULT CHART STOCK
  // =========================================================

  useEffect(() => {
    if (stocks.length > 0) {
      const selectedStillExists = stocks.some(
        (stock) => stock.symbol === selectedChartStock
      );

      if (!selectedChartStock || !selectedStillExists) {
        setSelectedChartStock(stocks[0].symbol);
      }
    } else {
      setSelectedChartStock("");
    }
  }, [stocks, selectedChartStock]);

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredStocks = stocks.filter((stock) => {
    const searchText = search.toLowerCase().trim();

    return (
      stock.symbol?.toLowerCase().includes(searchText) ||
      stock.name?.toLowerCase().includes(searchText)
    );
  });

  // =========================================================
  // ADD STOCK
  // =========================================================

  const addStock = async (stock) => {
    try {
      setAddingStock(true);

      const response = await fetch(`${API_URL}/api/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stock),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Unable to add stock");
        return;
      }

      setShowAddStock(false);

      await loadWatchlist(false);
      await loadAttention();

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      alert("Unable to connect to the backend.");
    } finally {
      setAddingStock(false);
    }
  };

  // =========================================================
  // REMOVE STOCK
  // =========================================================

  const removeStock = async (symbol) => {
    const confirmed = window.confirm(
      `Remove ${symbol} from your watchlist?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingStock(symbol);

      const response = await fetch(
        `${API_URL}/api/watchlist/${symbol}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Unable to remove stock");
        return;
      }

      if (selectedStock?.symbol === symbol) {
        setSelectedStock(null);
      }

      await loadWatchlist(false);
      await loadAttention();

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      alert("Unable to connect to the backend.");
    } finally {
      setRemovingStock("");
    }
  };

  // =========================================================
  // ATTENTION LEVEL
  // =========================================================

  const getAttention = (change) => {
    const absoluteChange = Math.abs(Number(change));

    if (absoluteChange >= 3) {
      return "High";
    }

    if (absoluteChange >= 1) {
      return "Medium";
    }

    return "Normal";
  };

  // =========================================================
  // FIND ATTENTION STOCK
  // =========================================================

  const getAttentionStock = () => {
    if (!attentionData || attentionData.length === 0) {
      return null;
    }

    const highStock = attentionData.find(
      (item) =>
        item.attention === "High" ||
        item.level === "High" ||
        item.attention_level === "High"
    );

    if (highStock) {
      return highStock;
    }

    return attentionData[0];
  };

  const attentionStock = getAttentionStock();

  // =========================================================
  // MATCH ATTENTION WITH STOCK
  // =========================================================

  const getStockDetails = (attentionItem) => {
    if (!attentionItem) {
      return null;
    }

    const symbol = attentionItem.symbol;

    return (
      stocks.find((stock) => stock.symbol === symbol) || null
    );
  };

  const selectedAttentionStock =
    getStockDetails(attentionStock);

  // =========================================================
  // ATTENTION VALUES
  // =========================================================

  const attentionLevel = selectedAttentionStock
    ? getAttention(selectedAttentionStock.change)
    : "Normal";

  const priceChange = selectedAttentionStock
    ? Number(selectedAttentionStock.change)
    : 0;

  const absoluteChange = Math.abs(priceChange);

  const priceAttention =
    absoluteChange >= 3
      ? "High"
      : absoluteChange >= 1
      ? "Medium"
      : "Normal";

  const volumeAttention =
    selectedAttentionStock &&
    Number(selectedAttentionStock.volume) >= 10000000
      ? "High"
      : "Normal";

  // =========================================================
  // 🚨 SMART ACTION INSIGHT
  // =========================================================

  const getSmartAction = (stock) => {
    if (!stock) {
      return {
        title: "No action required",
        message:
          "Your watchlist is currently showing normal market activity.",
        action:
          "Continue monitoring your watchlist for meaningful changes.",
        type: "normal",
      };
    }

    const change = Number(stock.change || 0);
    const volume = Number(stock.volume || 0);
    const absChange = Math.abs(change);

    const attention = getAttention(change);

    if (attention === "High" && change > 0 && volume >= 10000000) {
      return {
        title: `${stock.symbol} is showing high movement today.`,
        message: `Price is up ${change.toFixed(2)}% and trading volume is unusually high.`,
        action:
          "Consider reviewing the stock before making a new investment decision.",
        type: "high-positive",
      };
    }

    if (attention === "High" && change < 0 && volume >= 10000000) {
      return {
        title: `${stock.symbol} is showing significant downside movement.`,
        message: `Price is down ${absChange.toFixed(
          2
        )}% with unusually high trading volume.`,
        action:
          "Review the latest market conditions and company information before taking action.",
        type: "high-negative",
      };
    }

    if (attention === "High" && change > 0) {
      return {
        title: `${stock.symbol} is moving strongly upward.`,
        message: `The stock is up ${change.toFixed(
          2
        )}% today.`,
        action:
          "Review the reason behind the price movement before making a new investment decision.",
        type: "high-positive",
      };
    }

    if (attention === "High" && change < 0) {
      return {
        title: `${stock.symbol} is experiencing a strong decline.`,
        message: `The stock is down ${absChange.toFixed(
          2
        )}% today.`,
        action:
          "Check recent market and company developments before making a decision.",
        type: "high-negative",
      };
    }

    if (attention === "Medium" && change > 0) {
      return {
        title: `${stock.symbol} is showing moderate upward movement.`,
        message: `Price has increased by ${change.toFixed(
          2
        )}%.`,
        action:
          "Keep the stock on your watchlist and monitor its movement.",
        type: "medium",
      };
    }

    if (attention === "Medium" && change < 0) {
      return {
        title: `${stock.symbol} is showing moderate downside movement.`,
        message: `Price has decreased by ${absChange.toFixed(
          2
        )}%.`,
        action:
          "Monitor the stock and review any relevant market updates.",
        type: "medium",
      };
    }

    return {
      title: `${stock.symbol} is moving normally.`,
      message: "No major price movement has been detected.",
      action:
        "No immediate action is required. Continue monitoring the stock.",
      type: "normal",
    };
  };

  const smartInsight = getSmartAction(
    selectedAttentionStock
  );

  // =========================================================
  // CHART STOCK
  // =========================================================

  const chartStock =
    stocks.find(
      (stock) => stock.symbol === selectedChartStock
    ) ||
    stocks[0] ||
    null;

  // =========================================================
  // SELECT STOCK
  // =========================================================

  const handleStockSelect = (stock) => {
    setSelectedChartStock(stock.symbol);
  };

  // =========================================================
  // OPEN STOCK DETAILS
  // =========================================================

  const openStockDetails = (stock) => {
    setSelectedStock(stock);
    setSelectedChartStock(stock.symbol);
  };

  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const handleViewDetails = () => {
    if (!selectedAttentionStock) {
      return;
    }

    setSelectedChartStock(
      selectedAttentionStock.symbol
    );

    setTimeout(() => {
      overviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const notifications = stocks
    .map((stock) => {
      const change = Number(stock.change);
      const attention = getAttention(change);

      return {
        symbol: stock.symbol,
        name: stock.name,
        change,
        attention,
      };
    })
    .filter((item) => item.attention !== "Normal")
    .sort(
      (a, b) =>
        Math.abs(b.change) - Math.abs(a.change)
    );

  // =========================================================
  // CHART DATA
  // =========================================================

  const createChartData = () => {
    if (!chartStock) {
      return [];
    }

    const currentPrice = Number(chartStock.price);
    const change = Number(chartStock.change);

    if (!currentPrice) {
      return [];
    }

    let points;

    if (selectedPeriod === "1D") {
      points = [
        {
          time: "10 AM",
          value: currentPrice * 0.994,
        },
        {
          time: "11 AM",
          value: currentPrice * 0.997,
        },
        {
          time: "12 PM",
          value: currentPrice * 0.995,
        },
        {
          time: "1 PM",
          value: currentPrice * 1.001,
        },
        {
          time: "2 PM",
          value: currentPrice * 0.999,
        },
        {
          time: "3 PM",
          value: currentPrice * 1.003,
        },
        {
          time: "4 PM",
          value: currentPrice,
        },
      ];
    } else if (selectedPeriod === "1W") {
      points = [
        {
          time: "Mon",
          value: currentPrice * 0.985,
        },
        {
          time: "Tue",
          value: currentPrice * 0.992,
        },
        {
          time: "Wed",
          value: currentPrice * 0.989,
        },
        {
          time: "Thu",
          value: currentPrice * 0.997,
        },
        {
          time: "Fri",
          value: currentPrice,
        },
      ];
    } else {
      points = [
        {
          time: "Week 1",
          value: currentPrice * 0.96,
        },
        {
          time: "Week 2",
          value: currentPrice * 0.975,
        },
        {
          time: "Week 3",
          value: currentPrice * 0.985,
        },
        {
          time: "Week 4",
          value: currentPrice * 0.992,
        },
        {
          time: "Now",
          value: currentPrice,
        },
      ];
    }

    if (change < 0) {
      return points.map((point) => ({
        ...point,
        value:
          currentPrice +
          (point.value - currentPrice) * -1,
      }));
    }

    return points;
  };

  const chartData = createChartData();

  // =========================================================
  // LAST UPDATED TEXT
  // =========================================================

  const getLastUpdatedText = () => {
    if (!lastUpdated) {
      return "Not updated yet";
    }

    return lastUpdated.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">

        <div className="logo">
          <div className="logo-icon">
            M
          </div>

          <span>
            MarketPulse
          </span>
        </div>

        {/* SEARCH */}

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search stocks..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        {/* RIGHT SIDE */}

        <div className="nav-actions">

          {/* NOTIFICATION */}

          <div
            style={{
              position: "relative",
            }}
          >

            <button
              className="icon-button"
              title="Notifications"
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
            >

              <Bell size={20} />

              {notifications.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    minWidth: "17px",
                    height: "17px",
                    borderRadius: "50%",
                    background: "#e74c3c",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {notifications.length}
                </span>
              )}

            </button>

            {/* NOTIFICATION DROPDOWN */}

            {showNotifications && (

              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  width: "330px",
                  background: "white",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow:
                    "0 15px 45px rgba(0,0,0,0.16)",
                  border: "1px solid #eee",
                  zIndex: 500,
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >

                  <strong>
                    Notifications
                  </strong>

                  <button
                    onClick={() =>
                      setShowNotifications(false)
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} />
                  </button>

                </div>

                {notifications.length === 0 ? (

                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#777",
                      fontSize: "13px",
                    }}
                  >

                    <Activity
                      size={24}
                      style={{
                        marginBottom: "8px",
                      }}
                    />

                    <div>
                      No unusual activity detected.
                    </div>

                  </div>

                ) : (

                  notifications.map((item) => (

                    <div
                      key={item.symbol}
                      onClick={() => {
                        const stock = stocks.find(
                          (s) =>
                            s.symbol === item.symbol
                        );

                        if (stock) {
                          handleStockSelect(stock);
                          setShowNotifications(false);

                          setTimeout(() => {
                            overviewRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#fafafa",
                        marginBottom: "8px",
                        cursor: "pointer",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                        }}
                      >

                        <strong>
                          {item.symbol}
                        </strong>

                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "13px",
                          }}
                        >
                          {item.change >= 0
                            ? "+"
                            : ""}
                          {item.change}%
                        </span>

                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#777",
                          marginTop: "4px",
                        }}
                      >
                        {item.attention} attention
                        detected
                      </div>

                    </div>

                  ))

                )}

              </div>

            )}

          </div>

          {/* REFRESH */}

          <button
            className="icon-button"
            title="Refresh market data"
            onClick={refreshData}
            disabled={refreshing}
          >

            <RefreshCw
              size={19}
              style={{
                transform: refreshing
                  ? "rotate(360deg)"
                  : "none",
                transition: "transform 0.8s",
              }}
            />

          </button>

          {/* PROFILE */}

          <div className="profile">

            <div className="avatar">
              S
            </div>

            <span>
              SriVidya
            </span>

          </div>

        </div>

      </nav>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="container">

        {/* WELCOME */}

        <section className="welcome">

          <div>

            <p className="eyebrow">
              MARKET INTELLIGENCE
            </p>

            <h1>
              Good morning 👋
            </h1>

            <p className="subtitle">
              Here's what changed since your last visit.
            </p>

          </div>

          <div className="market-status">

            <span className="status-dot"></span>

            Market Open

          </div>

        </section>

        {/* BACKEND STATUS */}

        <div
          style={{
            marginBottom: "10px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: error
              ? "#fff0f0"
              : "#eef8f2",
            color: error
              ? "#c94c4c"
              : "#218653",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >

          <span>
            {error
              ? `⚠️ ${error}`
              : "✓ Connected to MarketPulse database"}
          </span>

          <span
            style={{
              fontSize: "11px",
              fontWeight: "500",
              opacity: 0.8,
            }}
          >
            Updated: {getLastUpdatedText()}
          </span>

        </div>

        {/* =====================================================
            ATTENTION CARD
        ===================================================== */}

        {!loading && selectedAttentionStock && (

          <section className="attention-card">

            <div className="attention-header">

              <div>

                <div className="attention-title">

                  <Zap size={20} />

                  Attention Required

                </div>

                <p>
                  We found a meaningful change
                  in your watchlist.
                </p>

              </div>

              <span className="high-badge">

                {attentionLevel.toUpperCase()}
                {" "}ATTENTION

              </span>

            </div>

            <div className="attention-content">

              <div className="stock-main">

                <div className="stock-symbol">
                  {selectedAttentionStock.symbol}
                </div>

                <div className="stock-name">
                  {selectedAttentionStock.name}
                </div>

                <div className="big-price">

                  ₹
                  {Number(
                    selectedAttentionStock.price
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}

                </div>

                <div
                  className={
                    priceChange >= 0
                      ? "positive-change"
                      : "change negative"
                  }
                >

                  {priceChange >= 0 ? (
                    <TrendingUp size={18} />
                  ) : (
                    <TrendingDown size={18} />
                  )}

                  {priceChange >= 0 ? "+" : ""}

                  {priceChange}%

                </div>

              </div>

              <div className="change-reasons">

                <h3>
                  Why should you care?
                </h3>

                <div className="reason">

                  <span>
                    Price movement
                  </span>

                  <div className="progress">

                    <div
                      className="progress-fill high"
                      style={{
                        width:
                          priceAttention === "High"
                            ? "90%"
                            : priceAttention === "Medium"
                            ? "60%"
                            : "30%",
                      }}
                    />

                  </div>

                  <strong>
                    {priceAttention}
                  </strong>

                </div>

                <div className="reason">

                  <span>
                    Trading volume
                  </span>

                  <div className="progress">

                    <div
                      className="progress-fill volume"
                      style={{
                        width:
                          volumeAttention === "High"
                            ? "90%"
                            : "35%",
                      }}
                    />

                  </div>

                  <strong>
                    {volumeAttention}
                  </strong>

                </div>

                <p className="explanation">

                  <strong>
                    {selectedAttentionStock.symbol}
                  </strong>{" "}

                  has a{" "}

                  {attentionLevel.toLowerCase()}
                  {" "}attention level based on its
                  recent market movement and
                  trading activity.

                </p>

                <button
                  className="details-button"
                  onClick={handleViewDetails}
                >

                  View details

                  <ChevronRight size={18} />

                </button>

              </div>

            </div>

          </section>

        )}

        {/* =====================================================
            🚨 SMART ACTION INSIGHT
        ===================================================== */}

        {!loading && selectedAttentionStock && (

          <section
            className={`smart-action-card ${smartInsight.type}`}
          >

            <div className="smart-action-icon">
              <Lightbulb size={22} />
            </div>

            <div className="smart-action-content">

              <div className="smart-action-label">
                WHAT SHOULD I DO?
              </div>

              <h2>
                {smartInsight.title}
              </h2>

              <p className="smart-action-message">
                {smartInsight.message}
              </p>

              <div className="smart-action-recommendation">

                <span className="action-bulb">
                  💡
                </span>

                <div>
                  <strong>
                    Action:
                  </strong>{" "}
                  {smartInsight.action}
                </div>

              </div>

              <p className="smart-action-disclaimer">
                This is a market-monitoring insight,
                not financial advice.
              </p>

            </div>

          </section>

        )}

        {/* =====================================================
            MARKET MONITOR
        ===================================================== */}

        {!loading &&
          stocks.length > 0 &&
          !selectedAttentionStock && (

            <section
              className="attention-card"
              style={{
                marginBottom: "30px",
              }}
            >

              <div className="attention-header">

                <div>

                  <div className="attention-title">

                    <Activity size={20} />

                    Market Monitor

                  </div>

                  <p>
                    Your watchlist is being monitored
                    for meaningful changes.
                  </p>

                </div>

                <span className="high-badge">
                  MONITORING
                </span>

              </div>

            </section>

          )}

        {/* =====================================================
            WATCHLIST
        ===================================================== */}

        <section className="watchlist-section">

          <div className="section-header">

            <div>

              <h2>

                <Star size={21} />

                My Watchlist

              </h2>

              <p>
                Stocks saved in your MarketPulse account
              </p>

            </div>

            <button
              className="add-button"
              onClick={() =>
                setShowAddStock(true)
              }
            >

              <Plus size={18} />

              Add Stock

            </button>

          </div>

          <div className="stock-table">

            <div className="table-header">

              <span>STOCK</span>
              <span>PRICE</span>
              <span>CHANGE</span>
              <span>ATTENTION</span>
              <span>ACTION</span>

            </div>

            {loading && (

              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#777",
                }}
              >
                Loading your watchlist...
              </div>

            )}

            {!loading &&
              filteredStocks.length > 0 &&
              filteredStocks.map((stock) => {

                const attention =
                  getAttention(stock.change);

                const isSelected =
                  selectedChartStock ===
                  stock.symbol;

                return (

                  <div
                    className="stock-row"
                    key={stock.id || stock.symbol}
                    onClick={() =>
                      handleStockSelect(stock)
                    }
                    style={{
                      cursor: "pointer",
                      background: isSelected
                        ? "#f7f7f7"
                        : "transparent",
                      transition:
                        "background 0.2s ease",
                    }}
                  >

                    <div className="stock-info">

                      <div className="stock-icon">
                        {stock.symbol?.charAt(0)}
                      </div>

                      <div>

                        <strong>
                          {stock.symbol}
                        </strong>

                        <small>
                          {stock.name}
                        </small>

                      </div>

                    </div>

                    <strong>

                      ₹
                      {Number(
                        stock.price
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}

                    </strong>

                    <span
                      className={
                        Number(stock.change) >= 0
                          ? "change positive"
                          : "change negative"
                      }
                    >

                      {Number(stock.change) >= 0 ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}

                      {Number(stock.change) >= 0
                        ? "+"
                        : ""}

                      {stock.change}%

                    </span>

                    <span
                      className={`attention ${attention.toLowerCase()}`}
                    >

                      {attention === "High" && (
                        <Zap size={14} />
                      )}

                      {attention}

                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        alignItems: "center",
                      }}
                    >

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockDetails(stock);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#333",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "12px",
                        }}
                      >
                        Details
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(stock.symbol);
                        }}
                        disabled={
                          removingStock === stock.symbol
                        }
                        title={`Remove ${stock.symbol}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          border: "none",
                          background: "transparent",
                          color: "#888",
                          cursor:
                            removingStock === stock.symbol
                              ? "wait"
                              : "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          padding: "8px",
                        }}
                      >

                        <Trash2 size={15} />

                        {removingStock === stock.symbol
                          ? "Removing..."
                          : "Remove"}

                      </button>

                    </div>

                  </div>

                );
              })}

            {!loading &&
              filteredStocks.length === 0 && (

                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    color: "#777",
                  }}
                >

                  {search
                    ? "No matching stocks found."
                    : "Your watchlist is empty."}

                </div>

              )}

          </div>

        </section>

        {/* =====================================================
            MARKET OVERVIEW
        ===================================================== */}

        <section
          className="overview"
          ref={overviewRef}
          style={{
            scrollMarginTop: "30px",
          }}
        >

          <div className="section-header">

            <div>

              <h2>
                Market Overview
              </h2>

              <p>
                Price movement for your selected stock
              </p>

            </div>

            <div className="periods">

              {["1D", "1W", "1M"].map((period) => (

                <button
                  key={period}
                  className={
                    selectedPeriod === period
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedPeriod(period)
                  }
                >
                  {period}
                </button>

              ))}

            </div>

          </div>

          {stocks.length > 0 && (

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "15px",
              }}
            >

              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#555",
                }}
              >
                Stock:
              </label>

              <select
                value={selectedChartStock}
                onChange={(e) =>
                  setSelectedChartStock(
                    e.target.value
                  )
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >

                {stocks.map((stock) => (

                  <option
                    key={stock.symbol}
                    value={stock.symbol}
                  >
                    {stock.symbol}
                  </option>

                ))}

              </select>

              {chartStock && (

                <span
                  style={{
                    fontSize: "13px",
                    color:
                      Number(chartStock.change) >= 0
                        ? "#218653"
                        : "#c94c4c",
                    fontWeight: "700",
                  }}
                >

                  {Number(chartStock.change) >= 0
                    ? "+"
                    : ""}
                  {chartStock.change}%

                </span>

              )}

            </div>

          )}

          <div
            className="chart-placeholder"
            style={{
              height: "330px",
              padding: "20px",
            }}
          >

            <div
              className="chart-label"
              style={{
                marginBottom: "10px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >

              <BarChart3 size={18} />

              {chartStock?.symbol || "RELIANCE"}

            </div>

            {chartData.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height="85%"
              >

                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="time"
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 12,
                    }}
                    tickFormatter={(value) =>
                      `₹${Number(value).toLocaleString(
                        "en-IN"
                      )}`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `₹${Number(value).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}`,
                      "Price",
                    ]}
                    labelStyle={{
                      fontWeight: "700",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#111111"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                    }}
                    activeDot={{
                      r: 7,
                    }}
                    animationDuration={700}
                  />

                </LineChart>

              </ResponsiveContainer>

            ) : (

              <div
                style={{
                  height: "85%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#777",
                }}
              >
                No market data available.
              </div>

            )}

          </div>

        </section>

      </main>

      {/* =====================================================
          STOCK DETAILS MODAL
      ===================================================== */}

      {selectedStock && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
            padding: "20px",
          }}
          onClick={() =>
            setSelectedStock(null)
          }
        >

          <div
            style={{
              background: "white",
              width: "480px",
              maxWidth: "100%",
              borderRadius: "20px",
              padding: "28px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.25)",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >

              <div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >

                  <div className="stock-icon">
                    {selectedStock.symbol?.charAt(0)}
                  </div>

                  <div>

                    <h2
                      style={{
                        margin: 0,
                      }}
                    >
                      {selectedStock.symbol}
                    </h2>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      {selectedStock.name}
                    </p>

                  </div>

                </div>

              </div>

              <button
                onClick={() =>
                  setSelectedStock(null)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>

            </div>

            <div
              style={{
                marginBottom: "24px",
              }}
            >

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "800",
                }}
              >

                ₹
                {Number(
                  selectedStock.price
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}

              </div>

              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "700",
                  color:
                    Number(selectedStock.change) >= 0
                      ? "#218653"
                      : "#c94c4c",
                }}
              >

                {Number(selectedStock.change) >= 0 ? (
                  <TrendingUp size={18} />
                ) : (
                  <TrendingDown size={18} />
                )}

                {Number(selectedStock.change) >= 0
                  ? "+"
                  : ""}
                {selectedStock.change}%

              </div>

            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "12px",
              }}
            >

              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#f7f7f7",
                }}
              >

                <small
                  style={{
                    color: "#777",
                  }}
                >
                  Attention
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  {getAttention(
                    selectedStock.change
                  )}
                </strong>

              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#f7f7f7",
                }}
              >

                <small
                  style={{
                    color: "#777",
                  }}
                >
                  Trading Volume
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  {Number(
                    selectedStock.volume || 0
                  ).toLocaleString("en-IN")}
                </strong>

              </div>

            </div>

            {/* SMART ACTION INSIGHT INSIDE DETAILS */}

            <div className="modal-smart-action">

              <div className="modal-smart-icon">
                <Lightbulb size={18} />
              </div>

              <div>

                <span>
                  WHAT SHOULD I DO?
                </span>

                <strong>
                  {getSmartAction(selectedStock).title}
                </strong>

                <p>
                  {getSmartAction(selectedStock).action}
                </p>

              </div>

            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "22px",
              }}
            >

              <button
                className="details-button"
                onClick={() => {
                  setSelectedChartStock(
                    selectedStock.symbol
                  );

                  setSelectedStock(null);

                  setTimeout(() => {
                    overviewRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 100);
                }}
                style={{
                  flex: 1,
                }}
              >

                View Chart

                <ChevronRight size={18} />

              </button>

              <button
                onClick={() => {
                  setSelectedStock(null);
                  removeStock(
                    selectedStock.symbol
                  );
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >

                <Trash2 size={16} />

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          ADD STOCK MODAL
      ===================================================== */}

      {showAddStock && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() =>
            setShowAddStock(false)
          }
        >

          <div
            style={{
              background: "white",
              width: "420px",
              maxWidth: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "18px",
              padding: "28px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Add Stock
                </h2>

                <p
                  style={{
                    marginTop: "6px",
                    color: "#777",
                    fontSize: "14px",
                  }}
                >
                  Choose a stock for your watchlist
                </p>

              </div>

              <button
                onClick={() =>
                  setShowAddStock(false)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "25px",
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                ×
              </button>

            </div>

            {availableStocks.length === 0 ? (

              <p
                style={{
                  textAlign: "center",
                  color: "#777",
                }}
              >
                No stocks available.
              </p>

            ) : (

              availableStocks.map((stock) => {

                const alreadyAdded =
                  stocks.some(
                    (item) =>
                      item.symbol ===
                      stock.symbol
                  );

                return (

                  <div
                    key={stock.symbol}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      padding: "14px",
                      border:
                        "1px solid #eee",
                      borderRadius: "12px",
                      marginBottom: "10px",
                    }}
                  >

                    <div>

                      <strong>
                        {stock.symbol}
                      </strong>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#777",
                          marginTop: "3px",
                        }}
                      >
                        {stock.name}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >

                        ₹
                        {Number(
                          stock.price
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}

                      </div>

                    </div>

                    <button
                      disabled={
                        alreadyAdded ||
                        addingStock
                      }
                      onClick={() =>
                        addStock(stock)
                      }
                      style={{
                        padding:
                          "8px 14px",
                        borderRadius:
                          "8px",
                        border: "none",
                        cursor:
                          alreadyAdded ||
                          addingStock
                            ? "default"
                            : "pointer",
                        background:
                          alreadyAdded
                            ? "#eeeeee"
                            : "#111111",
                        color:
                          alreadyAdded
                            ? "#777777"
                            : "white",
                        fontWeight: "600",
                      }}
                    >

                      {alreadyAdded
                        ? "Added"
                        : addingStock
                        ? "Adding..."
                        : "Add"}

                    </button>

                  </div>

                );

              })

            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default App;