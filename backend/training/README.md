# Gossip Girl AI Training

This directory contains training data and configuration for creating a fine-tuned Gossip Girl AI model. 

## Current Setup

The application now uses a fine-tuned "gossipgirl" model instead of the generic "llama3:latest" model. This provides:

- More authentic Gossip Girl voice and tone
- Better character-specific responses  
- Reduced prompt complexity
- More consistent output quality

## Files

- `gossipgirl.jsonl` - Training data in JSONL format (prompt-response pairs)
- `Modelfile` - Ollama model configuration for fine-tuning
- `README.md` - This file

## Setup Instructions

### 1. Create the Fine-tuned Model
```bash
cd training
ollama create gossipgirl -f Modelfile
```

### 2. Train the Model with Your Data
```bash
ollama train gossipgirl --dataset=gossipgirl.jsonl
```

### 3. Update Application Configuration
The application is already configured to use the "gossipgirl" model in `ollama_client.py`.

## Training Data Format

The training data uses JSONL format with prompt-response pairs:
- `prompt`: User tip or observation about a character
- `response`: Gossip Girl's dramatic response

Example:
```json
{"prompt": "Spotted: Blair was shopping on Fifth Avenue", "response": "Queen B's Latest Move..."}
```

## Characters Covered

- Blair Waldorf (Queen B)
- Serena van der Woodsen (It-girl)
- Chuck Bass (Bad boy billionaire)
- Nate Archibald (Golden boy)
- Dan Humphrey (Lonely boy writer)
- Vanessa Abrams (Documentarian)
- Jenny Humphrey (Little J)

## Model Behavior

The fine-tuned model should:
- Respond in Gossip Girl's voice
- Create dramatic, scandalous gossip
- Use Upper East Side references
- Handle character-specific scenarios
- Maintain consistent tone without complex prompts

## Alternative: Prompt Engineering Approach

If you haven't created the fine-tuned model yet, you can temporarily use the generic approach by changing `MODEL = "gossipgirl"` to `MODEL = "llama3:latest"` in `ollama_client.py`. However, this requires more complex prompts and may not produce as authentic results.
