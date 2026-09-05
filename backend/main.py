from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import Watchlist, MarketSnapshot


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# CREATE FASTAPI APP
# =========================================================

app = FastAPI(
    title="MarketPulse API",
    description="Market intelligence and personalized stock monitoring API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "MarketPulse API is running!"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# =========================================================
# TEST MESSAGE
# =========================================================

@app.get("/api/message")
def get_message():
    return {
        "message": "Hello from MarketPulse backend!"
    }


# =========================================================
# AVAILABLE STOCKS
# =========================================================

@app.get("/api/stocks")
def get_stocks():

    return [
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries",
            "price": 1420.50,
            "change": 5.24,
            "volume": 17000000
        },
        {
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "price": 3245.80,
            "change": 0.42,
            "volume": 8200000
        },
        {
            "symbol": "INFY",
            "name": "Infosys",
            "price": 1540.25,
            "change": -3.12,
            "volume": 12500000
        },
        {
            "symbol": "HDFCBANK",
            "name": "HDFC Bank",
            "price": 1920.10,
            "change": 0.31,
            "volume": 9100000
        }
    ]


# =========================================================
# ADD STOCK TO WATCHLIST
# =========================================================

@app.post("/api/watchlist")
def add_to_watchlist(
    stock: dict,
    db: Session = Depends(get_db)
):

    # Check if stock already exists

    existing_stock = (
        db.query(Watchlist)
        .filter(
            Watchlist.symbol == stock["symbol"].upper()
        )
        .first()
    )

    if existing_stock:

        raise HTTPException(
            status_code=400,
            detail="Stock already exists in watchlist"
        )


    # Create new stock

    new_stock = Watchlist(
        symbol=stock["symbol"].upper(),
        name=stock["name"],
        price=stock["price"],
        change=stock["change"],
        volume=stock["volume"]
    )


    db.add(new_stock)

    db.commit()

    db.refresh(new_stock)


    return {
        "message": "Stock added successfully",

        "stock": {
            "id": new_stock.id,
            "symbol": new_stock.symbol,
            "name": new_stock.name,
            "price": new_stock.price,
            "change": new_stock.change,
            "volume": new_stock.volume
        }
    }


# =========================================================
# GET WATCHLIST
# =========================================================

@app.get("/api/watchlist")
def get_watchlist(
    db: Session = Depends(get_db)
):

    stocks = (
        db.query(Watchlist)
        .all()
    )


    return [
        {
            "id": stock.id,
            "symbol": stock.symbol,
            "name": stock.name,
            "price": stock.price,
            "change": stock.change,
            "volume": stock.volume
        }

        for stock in stocks
    ]


# =========================================================
# DELETE STOCK FROM WATCHLIST
# =========================================================

@app.delete("/api/watchlist/{symbol}")
def remove_from_watchlist(
    symbol: str,
    db: Session = Depends(get_db)
):

    stock = (
        db.query(Watchlist)
        .filter(
            Watchlist.symbol == symbol.upper()
        )
        .first()
    )


    if not stock:

        raise HTTPException(
            status_code=404,
            detail="Stock not found in watchlist"
        )


    db.delete(stock)

    db.commit()


    return {
        "message":
        f"{symbol.upper()} removed successfully"
    }


# =========================================================
# CREATE MARKET SNAPSHOT
# =========================================================

@app.post("/api/snapshot")
def create_snapshot(
    db: Session = Depends(get_db)
):

    # Current market data
    #
    # For now this is simulated data.
    # Later we will connect a real market API.

    stocks = [

        {
            "symbol": "RELIANCE",
            "price": 1420.50,
            "change": 5.24,
            "volume": 17000000
        },

        {
            "symbol": "TCS",
            "price": 3245.80,
            "change": 0.42,
            "volume": 8200000
        },

        {
            "symbol": "INFY",
            "price": 1540.25,
            "change": -3.12,
            "volume": 12500000
        },

        {
            "symbol": "HDFCBANK",
            "price": 1920.10,
            "change": 0.31,
            "volume": 9100000
        }
    ]


    # Save every stock as a snapshot

    for stock in stocks:

        snapshot = MarketSnapshot(

            symbol=stock["symbol"],

            price=stock["price"],

            change=stock["change"],

            volume=stock["volume"]
        )

        db.add(snapshot)


    db.commit()


    return {

        "message":
        "Market snapshot saved successfully",

        "stocks_saved":
        len(stocks)
    }


# =========================================================
# GET CHANGES
# =========================================================

@app.get("/api/changes")
def get_changes(
    db: Session = Depends(get_db)
):

    symbols = [
        "RELIANCE",
        "TCS",
        "INFY",
        "HDFCBANK"
    ]


    results = []


    for symbol in symbols:

        snapshots = (

            db.query(MarketSnapshot)

            .filter(
                MarketSnapshot.symbol == symbol
            )

            .order_by(
                MarketSnapshot.created_at.desc()
            )

            .limit(2)

            .all()
        )


        # Need two snapshots
        # to calculate a change

        if len(snapshots) < 2:

            continue


        latest = snapshots[0]

        previous = snapshots[1]


        # =========================================
        # PRICE DIFFERENCE
        # =========================================

        price_difference = (
            latest.price -
            previous.price
        )


        if previous.price != 0:

            price_percentage = (

                price_difference /
                previous.price

            ) * 100

        else:

            price_percentage = 0


        # =========================================
        # VOLUME DIFFERENCE
        # =========================================

        volume_difference = (
            latest.volume -
            previous.volume
        )


        if previous.volume != 0:

            volume_percentage = (

                volume_difference /
                previous.volume

            ) * 100

        else:

            volume_percentage = 0


        # =========================================
        # RESULT
        # =========================================

        results.append({

            "symbol":
            symbol,

            "previous_price":
            previous.price,

            "current_price":
            latest.price,

            "price_difference":
            round(
                price_difference,
                2
            ),

            "price_percentage":
            round(
                price_percentage,
                2
            ),

            "previous_volume":
            previous.volume,

            "current_volume":
            latest.volume,

            "volume_difference":
            volume_difference,

            "volume_percentage":
            round(
                volume_percentage,
                2
            )
        })


    return results


# =========================================================
# ATTENTION SCORE
# =========================================================

@app.get("/api/attention")
def get_attention(
    db: Session = Depends(get_db)
):

    symbols = [
        "RELIANCE",
        "TCS",
        "INFY",
        "HDFCBANK"
    ]


    results = []


    for symbol in symbols:

        # Get latest two snapshots

        snapshots = (

            db.query(MarketSnapshot)

            .filter(
                MarketSnapshot.symbol == symbol
            )

            .order_by(
                MarketSnapshot.created_at.desc()
            )

            .limit(2)

            .all()
        )


        # Need two snapshots

        if len(snapshots) < 2:

            continue


        latest = snapshots[0]

        previous = snapshots[1]


        # =========================================
        # PRICE CHANGE %
        # =========================================

        if previous.price != 0:

            price_change = (

                (
                    latest.price -
                    previous.price
                )

                /

                previous.price

            ) * 100

        else:

            price_change = 0


        # =========================================
        # VOLUME CHANGE %
        # =========================================

        if previous.volume != 0:

            volume_change = (

                (
                    latest.volume -
                    previous.volume
                )

                /

                previous.volume

            ) * 100

        else:

            volume_change = 0


        # =========================================
        # ATTENTION SCORE
        # =========================================

        # Price contributes maximum 60 points

        price_score = min(
            abs(price_change) * 15,
            60
        )


        # Volume contributes maximum 40 points

        volume_score = min(
            abs(volume_change) * 0.4,
            40
        )


        attention_score = round(
            price_score +
            volume_score
        )


        # Make sure score never exceeds 100

        attention_score = min(
            attention_score,
            100
        )


        # =========================================
        # ATTENTION LEVEL
        # =========================================

        if attention_score >= 70:

            level = "High"

        elif attention_score >= 40:

            level = "Medium"

        else:

            level = "Normal"


        # =========================================
        # REASONS
        # =========================================

        reasons = []


        if abs(price_change) >= 3:

            reasons.append(
                "Significant price movement"
            )

        elif abs(price_change) >= 1:

            reasons.append(
                "Noticeable price movement"
            )


        if abs(volume_change) >= 30:

            reasons.append(
                "Unusual trading volume"
            )

        elif abs(volume_change) >= 10:

            reasons.append(
                "Increased trading activity"
            )


        if not reasons:

            reasons.append(
                "No significant movement detected"
            )


        # =========================================
        # ADD RESULT
        # =========================================

        results.append({

            "symbol":
            symbol,

            "price_change_percentage":
            round(
                price_change,
                2
            ),

            "volume_change_percentage":
            round(
                volume_change,
                2
            ),

            "attention_score":
            attention_score,

            "attention_level":
            level,

            "reasons":
            reasons
        })


    # =========================================
    # SORT BY HIGHEST ATTENTION
    # =========================================

    results.sort(
        key=lambda x:
        x["attention_score"],
        reverse=True
    )


    return results