from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime

from database import Base


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)

    symbol = Column(String, unique=True, index=True, nullable=False)

    name = Column(String, nullable=False)

    price = Column(Float, nullable=False)

    change = Column(Float, nullable=False)

    volume = Column(Integer, nullable=False)

    added_at = Column(DateTime, default=datetime.utcnow)
class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    change = Column(Float)
    volume = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)