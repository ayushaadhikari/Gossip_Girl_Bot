from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime
from db import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Tip(Base):
    __tablename__ = "tips"
    
    id = Column(Integer, primary_key=True)
    character = Column(String)
    tip = Column(Text)
    scheduled_at = Column(DateTime)
    processed = Column(Integer, default=0)
    user_id = Column(Integer, nullable=True)  # Link to user who submitted
    created_at = Column(DateTime, default=datetime.utcnow)


class Blast(Base):
    __tablename__ = "blasts"
    
    id = Column(Integer, primary_key=True, index=True)
    character = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
