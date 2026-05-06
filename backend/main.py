from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib
import secrets
import asyncio
import json
import random
import os
from dotenv import load_dotenv

load_dotenv()

from models import User, Tip, Blast
from db import SessionLocal
from character_assets import CHARACTER_IMAGES
from ollama_client import generate_blast
from auth import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

# Configuration
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(",")]

# Character name mapping for filtering
CHARACTER_NAME_MAP = {
    "Serena": "Serena van der Woodsen",
    "Blair": "Blair Waldorf", 
    "Nate": "Nate Archibald",
    "Chuck": "Chuck Bass",
    "Dan": "Dan Humphrey",
    "Vanessa": "Vanessa Abrams",
    "Jenny": "Jenny Humphrey"
}

# Auto-generation configuration
CHARACTERS = ["Serena", "Blair", "Chuck", "Nate", "Dan", "Vanessa", "Jenny"]
AUTO_GENERATION_TOPICS = [
    "spotted at a exclusive event",
    "caught in a compromising situation", 
    "seen with a mystery person",
    "involved in a scandalous rumor",
    "making a power move",
    "caught in a love triangle",
    "spotted shopping on Fifth Avenue",
    "seen at a secret meeting",
    "involved in family drama",
    "making headlines in the society pages"
]
AUTO_GENERATION_INTERVAL = 60  # seconds

app = FastAPI(title="Gossip Girl API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"REQUEST: {request.method} {request.url}")
    response = await call_next(request)
    print(f"RESPONSE: {response.status_code}")
    return response

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str

class TipRequest(BaseModel):
    character: str
    tip: str

# Auth endpoints
@app.post("/auth/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    hashed_password = hash_password(user.password)
    db_user = db.query(User).filter(
        User.username == user.username,
        User.password == hashed_password
    ).first()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/auth/me", response_model=UserResponse)
def update_user(user_update: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check for conflicts
    existing_user = db.query(User).filter(User.username == user_update.username).filter(User.id != current_user.id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = db.query(User).filter(User.email == user_update.email).filter(User.id != current_user.id).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update user
    current_user.username = user_update.username
    current_user.email = user_update.email
    current_user.first_name = user_update.first_name
    current_user.last_name = user_update.last_name
    if user_update.password:
        current_user.password = hash_password(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Character image mapping
CHARACTER_IMAGES_MAP = {
    **CHARACTER_IMAGES,
    "Serena van der Woodsen": "/images/serena.jpg",
    "Blair Waldorf": "/images/blair.jpg",
    "Chuck Bass": "/images/chuck.jpg",
    "Nate Archibald": "/images/nate.jpg",
    "Dan Humphrey": "/images/dan.jpg",
    "Vanessa Abrams": "/images/vanessa.jpg",
    "Jenny Humphrey": "/images/jenny.jpg"
}

@app.delete("/delete-all-blasts")
def delete_all_blasts(db: Session = Depends(get_db)):
    """Delete all blasts from the database"""
    try:
        # Delete all blasts
        deleted_count = db.query(Blast).count()
        db.query(Blast).delete()
        db.commit()
        
        return {"message": f"Deleted {deleted_count} blasts successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e), "message": "Failed to delete blasts"}

@app.get("/test")
def test_endpoint():
    return {"message": "Backend is working!", "timestamp": datetime.utcnow()}

@app.get("/history")
def get_history(character: Optional[str] = None, db: Session = Depends(get_db)):
    print(f"DEBUG: History endpoint called with character: '{character}'")
    
    query = db.query(Blast)
    
    if character and character != "all":
        # Map short name to full name
        full_character = CHARACTER_NAME_MAP.get(character, character)
        print(f"DEBUG: Mapped '{character}' to '{full_character}'")
        
        # Try exact match with full name first
        query = query.filter(Blast.character == full_character)
        
        # If no results, try with original character name
        if query.count() == 0:
            print(f"DEBUG: No results with full name, trying original: '{character}'")
            query = db.query(Blast).filter(Blast.character == character)
    else:
        print("DEBUG: No character filter applied (showing all)")
    
    blasts = query.order_by(Blast.created_at.desc()).limit(50).all()
    print(f"DEBUG: Found {len(blasts)} blasts")
    
    # Show first few character names for debugging
    for i, blast in enumerate(blasts[:3]):
        print(f"DEBUG: Blast {i+1} character: '{blast.character}'")
    
    return [{
        "id": blast.id,
        "character": blast.character,
        "title": blast.title,
        "content": blast.content,
        "image": CHARACTER_IMAGES_MAP.get(blast.character, ""),
        "created_at": blast.created_at
    } for blast in blasts]

@app.get("/feed")
def get_feed():
    db = SessionLocal()
    latest_blast = db.query(Blast).order_by(Blast.created_at.desc()).first()
    db.close()
    
    if not latest_blast:
        return []
    
    return [{
        "id": latest_blast.id,
        "character": latest_blast.character,
        "title": latest_blast.title,
        "image": CHARACTER_IMAGES_MAP.get(latest_blast.character, ""),
        "content": latest_blast.content,
        "created_at": latest_blast.created_at
    }]

@app.post("/submit-tip")
def submit_tip(data: TipRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        blast_data = generate_blast(data.character, data.tip)

        if not blast_data:
            return {"error": "AI failed to generate a valid blast"}

        db_blast = Blast(
            character=blast_data["character"],
            title=blast_data["title"],
            content=blast_data["content"],
            created_at=datetime.utcnow()
        )
        db.add(db_blast)

        # Also save the tip for history (marked as processed)
        db_tip = Tip(
            character=data.character,
            tip=data.tip,
            scheduled_at=datetime.utcnow(),
            processed=1,
            user_id=current_user.id,
        )
        db.add(db_tip)

        db.commit()
        db.refresh(db_blast)
        db.refresh(db_tip)

        return {
            "tip": {
                "id": db_tip.id,
                "character": db_tip.character,
                "tip": db_tip.tip,
                "scheduled_at": db_tip.scheduled_at.isoformat() if db_tip.scheduled_at else None,
                "processed": db_tip.processed,
                "created_at": db_tip.created_at.isoformat() if db_tip.created_at else None,
                "user_id": db_tip.user_id,
            },
            "blast": {
                "id": db_blast.id,
                "character": db_blast.character,
                "title": db_blast.title,
                "content": db_blast.content,
                "image": CHARACTER_IMAGES_MAP.get(db_blast.character, ""),
                "created_at": db_blast.created_at.isoformat() if db_blast.created_at else None
            },
            "message": "Tip submitted and blast created successfully"
        }

    except Exception as e:
        db.rollback()
        return {
            "error": str(e),
            "message": "Failed to submit tip"
        }


@app.get("/my-tips")
def get_my_tips(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tips = db.query(Tip).filter(Tip.user_id == current_user.id).order_by(Tip.created_at.desc()).all()
    
    return [{
        "id": tip.id,
        "character": tip.character,
        "tip": tip.tip,
        "scheduled_at": tip.scheduled_at,
        "processed": tip.processed,
        "created_at": tip.created_at
    } for tip in tips]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/stream")
async def blast_stream():
    async def event_generator():
        last_blast_id = 0
        yield ": connected\n\n"
        
        while True:
            db = SessionLocal()
            latest_blast = db.query(Blast).order_by(Blast.created_at.desc()).first()
            db.close()
            
            if latest_blast and latest_blast.id != last_blast_id:
                last_blast_id = latest_blast.id
                blast_data = {
                    "id": latest_blast.id,
                    "character": latest_blast.character,
                    "title": latest_blast.title,
                    "image": CHARACTER_IMAGES_MAP.get(latest_blast.character, ""),
                    "content": latest_blast.content,
                    "created_at": latest_blast.created_at.isoformat()
                }
                yield f"data: {json.dumps(blast_data)}\n\n"
            
            await asyncio.sleep(0.5)  # Check every 0.5 seconds for faster updates
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@app.get("/feed")
def get_feed():
    db = SessionLocal()
    latest_blast = db.query(Blast).order_by(Blast.created_at.desc()).first()
    db.close()
    
    if not latest_blast:
        return []
    
    return [{
        "id": latest_blast.id,
        "character": latest_blast.character,
        "title": latest_blast.title,
        "content": latest_blast.content,
        "image": CHARACTER_IMAGES_MAP.get(latest_blast.character, ""),
        "created_at": latest_blast.created_at
    }]

# Auto-generation is handled by configuration constants at the top of the file

async def auto_generate_blast():
    """Generate random blasts at configured intervals."""
    while True:
        await asyncio.sleep(AUTO_GENERATION_INTERVAL)
        
        db = SessionLocal()
        try:
            latest_blast = db.query(Blast).order_by(Blast.created_at.desc()).first()
            
            should_generate = (
                latest_blast is None or 
                datetime.utcnow() - latest_blast.created_at >= timedelta(seconds=AUTO_GENERATION_INTERVAL)
            )
            
            if should_generate:
                character = random.choice(CHARACTERS)
                topic = random.choice(AUTO_GENERATION_TOPICS)
                auto_tip_content = f"{character} was {topic}"
                
                blast_data = generate_blast(character, auto_tip_content)
                
                if blast_data:
                    db_blast = Blast(
                        title=blast_data["title"],
                        content=blast_data["content"],
                        character=character,
                        created_at=datetime.utcnow()
                    )
                    db.add(db_blast)
                    db.commit()
                
        except Exception as e:
            db.rollback()
            print(f"Auto-generation error: {e}")
        finally:
            db.close()

# Start auto-generation when app starts
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_generate_blast())