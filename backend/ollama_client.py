import requests
import re
import os
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL = os.getenv("OLLAMA_MODEL", "gossipgirl")
MAX_SENTENCES = 2
MAX_RETRIES = 3
TEMPERATURE = 0.75
TIMEOUT = 60

# Content filters
BANNED_PHRASES = [
    "sorry",
    "apolog", 
    "as an ai",
    "i can't",
    "i cannot"
]

# Gossip Girl opening variations
GOSSIP_OPENINGS = [
    "Spotted:",
    "Word is:",
    "Just in:",
    "Rumor has it:",
    "Sources say:",
    "Breaking:",
    "Heads up:",
    "Listen up:"
]

def _clean_output(text: str) -> Optional[str]:
    """Clean and format AI-generated text."""
    if not text:
        return None

    # Filter banned phrases
    lowered = text.lower()
    if any(phrase in lowered for phrase in BANNED_PHRASES):
        return None

    # Remove quotes and trim
    text = text.strip().strip('"\'')
    
    # Limit sentence count
    sentences = re.split(r'(?<=[.!])\s+', text)
    if len(sentences) > MAX_SENTENCES:
        text = " ".join(sentences[:MAX_SENTENCES])

    return text


def _call_ollama(prompt: str) -> str:
    """Make API call to Ollama."""
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "temperature": TEMPERATURE
        },
        timeout=TIMEOUT
    )
    return response.json()["response"]


def _generate_title(character: str, tip: str) -> Optional[str]:
    """Generate a 2-4 word title for the blast."""
    prompt = f"Create a 2-4 word Gossip Girl title about {character}: {tip}"
    
    raw = _call_ollama(prompt)
    # Clean quotes and extra content
    title = re.sub(r'["\']', '', raw)
    title = re.split(r'XOXO|Gossip Girl', title, flags=re.IGNORECASE)[0].strip()
    
    words = title.split()
    if not (2 <= len(words) <= 4):
        return None

    return " ".join(word.capitalize() for word in words)


def generate_blast(character: str, tip: str) -> Optional[Dict[str, str]]:
    """Generate a complete Gossip Girl blast."""
    openings_str = ", ".join(GOSSIP_OPENINGS)
    prompt = f"Create a Gossip Girl blast about {character}: {tip}. Use variety in your opening - try {openings_str}"

    for attempt in range(MAX_RETRIES):
        raw = _call_ollama(prompt)
        content = _clean_output(raw)

        if not content:
            continue

        title = _generate_title(character, tip)
        if not title:
            continue

        return {
            "character": character,
            "title": title,
            "content": content
        }

    return None
