
# Realtime AI Voice Assistant Sample

A realtime AI voice assistant that responds in under 1000 ms.

## Overview

This project demonstrates a voice assistant that leverages AI to provide quick, accurate responses to user queries in real-time. The assistant uses Deepgram for voice recognition and transcription, and Groq for generating intelligent responses based on user input.

## Features

- **Real-time voice recognition:** Uses Deepgram's live transcription to convert speech to text.
- **AI-generated responses:** Utilizes Groq to process user queries and generate appropriate responses.
- **Audio output:** Converts text responses back to speech for playback.
- **WebSocket communication:** Establishes a two-way communication channel for real-time interaction.

## Technologies Used

- **Node.js**: Server-side JavaScript runtime environment.
- **Express**: Web framework for Node.js to handle routing and server logic.
- **Socket.IO**: Library for real-time web applications to enable real-time, bidirectional communication.
- **Deepgram**: API for speech recognition and transcription.
- **Groq**: AI model for generating conversational responses.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- Deepgram API Key
- Groq API (if required)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/exil0867/realtime-ai-voice-assistant-sample.git
   cd realtime-ai-voice-assistant-sample
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory and add your Deepgram/Groq API key:
     ```plaintext
     DEEPGRAM_API_KEY=<your_deepgram_api_key>
     GROQ_API_KEY=<your_groq_api_key>

     ```

### Running the Project

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000` to interact with the voice assistant.

## Usage

- Speak your query into the microphone.
- The assistant will process your voice input and provide a response within 1000 ms, if not, you probably live far from the server.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.