# Gossip Girl Bot

An AI-powered gossip girl app that brings the drama of the Upper East Side to life! This application uses fine-tuned Large Language Models (LLMs) to generate authentic Gossip Girl-style content. Users submit anonymous tips about characters, and the AI transforms them into scandalous "blasts" using a custom-trained model served through Ollama.

The app features a sophisticated AI pipeline that includes:
- **Custom Fine-tuned Model**: Trained on domain-specific gossip data using Ollama's training framework
- **Prompt Engineering**: Structured templates for consistent character-specific responses
- **Content Filtering**: Automated filtering to maintain authentic Gossip Girl voice
- **Temperature Control**: Configurable creativity parameters (0.75) for balanced output
- **Retry Logic**: Robust error handling with multiple generation attempts

## Features

- **Anonymous Tip Submission**: Submit juicy gossip about your favorite characters
- **AI-Generated Blasts**: Uses Ollama to generate authentic Gossip Girl-style posts
- **Character System**: Features all main characters including Serena, Blair, Chuck, Nate, Dan, Vanessa, and Jenny
- **User Authentication**: Secure token-based authentication system
- **Modern UI**: Clean, responsive React frontend with Tailwind CSS
- **Real-time Updates**: Live gossip feed with the latest scandals

## File Structure

```
Gossip_Girl-main/
├── README.md
├── backend/
│   ├── main.py              # FastAPI server and API endpoints
│   ├── models.py            # Database models (User, Tip, Blast)
│   ├── db.py                # Database configuration
│   ├── auth.py              # Authentication logic
│   ├── ollama_client.py     # AI integration for generating blasts
│   ├── character_assets.py  # Character data and images
│   ├── requirements.txt     # Python dependencies
│   ├── gossip.db           # SQLite database
│   └── training/           # Training data for AI model
└── gossip-ui/
    ├── src/
    │   ├── components/      # React components
    │   ├── pages/          # Page components
    │   ├── hooks/          # Custom React hooks
    │   └── utils/          # Utility functions
    ├── public/             # Static assets
    ├── package.json        # Node.js dependencies
    └── vite.config.js      # Vite configuration
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama (for AI functionality)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd gossip-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Ollama Setup

1. Install Ollama by following the official guide at https://ollama.ai

2. Pull a compatible model (e.g., llama2):
```bash
ollama pull llama2
```

3. Start Ollama:
```bash
ollama serve
```

## AI/ML Training Process

The application uses a custom fine-tuned model for authentic Gossip Girl content generation:

### Model Architecture
- **Serving Platform**: Ollama (local LLM serving and fine-tuning)
- **Base Model**: Meta Llama 3.2 (3B parameters) served via Ollama
- **Fine-tuning**: Domain-specific training using Ollama's training framework
- **Training Data**: 30K+ prompt-response pairs in JSONL format
- **Model Name**: `gossipgirl` (custom fine-tuned model)

### Training Pipeline
1. **Data Preparation**: JSONL format with structured prompt-response pairs
2. **Model Creation**: `ollama create gossipgirl -f Modelfile`
3. **Fine-tuning**: `ollama train gossipgirl --dataset=gossipgirl.jsonl`
4. **System Prompt**: Custom Gossip Girl persona injection
5. **Template Configuration**: Structured chat format for consistent outputs

### Generation Parameters
- **Temperature**: 0.75 (balanced creativity)
- **Max Sentences**: 2 (concise blasts)
- **Max Retries**: 3 (robust error handling)
- **Content Filters**: Automated removal of AI-like responses
- **Opening Variations**: 8 different Gossip Girl-style openings

### Model Behavior
- Maintains authentic Gossip Girl voice and tone
- Generates character-specific scandalous content
- Uses Upper East Side references and slang
- Automatically ends with "XOXO, Gossip Girl" signature

## Usage

1. Make sure both backend and frontend servers are running
2. Open your browser and navigate to `http://localhost:5173`
3. Create an account or log in
4. Submit anonymous tips about characters
5. Watch as the AI generates scandalous Gossip Girl blasts!

## API Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - User login
- `POST /tips` - Submit an anonymous tip
- `GET /blasts` - Get all gossip blasts
- `GET /characters` - Get character information

## Technology Stack

**Backend:**
- FastAPI (REST API framework)
- SQLAlchemy (ORM and database management)
- SQLite (database)
- Python JWT authentication (token-based security)

**AI/ML Infrastructure:**
- Ollama (local LLM serving and fine-tuning)
- Meta Llama 3.2 (base model architecture)
- Custom fine-tuned "gossipgirl" model
- JSONL training data format (30K+ training examples)
- Temperature-controlled generation (0.75)
- Automated content filtering and retry logic

**Frontend:**
- React 19 (UI framework)
- Vite (build tool and dev server)
- Tailwind CSS (styling framework)
- Axios (HTTP client for API calls)

## Contributing

Feel free to submit issues and pull requests to help improve the app!
