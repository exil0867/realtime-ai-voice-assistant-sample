import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { getGroqChat } from './lib/groq.js'
import { createClient, LiveTranscriptionEvents, }  from "@deepgram/sdk";
const log = (o) => {
console.log(o)
}
const app = express();
let keepAlive
let count=0;
let sid1=0;
let sid2=0;
let pl1=0;

const systemPrompt = `
You are an AI assistant for a clinic receptionist. Provide clear, friendly, and accurate responses to callers about their medical concerns and appointment scheduling. Collect information step by step, and once a detail is provided, do not ask for it again. Always ask for one piece of information at a time to avoid overwhelming the caller.

Key points:
1. Begin by asking about the caller's medical concern and symptoms:
   - "Could you tell me what symptoms you're experiencing?"
   - "When did these symptoms start?"
   - "Have you experienced this issue before?"

2. After gathering the symptoms, move on to collect personal and contact information in a structured, conditional manner:
   - Ask for the caller's full name: "May I have your full name, please?"
   - Ask for the caller's age: "How old are you?"
   - Ask for the phone number: "Can I get a phone number to contact you?" 
      - If they don't have a phone number, say: "Do you have an email address instead?"
         - If yes, collect the email: "Could you spell out your email address, letter by letter, so I can ensure it's accurate?"
   - Once contact information is gathered, ask when they'd like to schedule an appointment: "When would be a good time for you to schedule your appointment?"

3. Ensure responses are short, clear, and friendly, allowing pauses for the caller to respond.

4. Always summarize the information you receive:
   - Example: "Thank you. I have your name as [name] and your age as [age]. Is that correct?"

5. When all necessary information is collected, politely conclude the conversation:
   - "Thank you for providing all the information. We'll get back to you shortly to confirm your appointment. Have a great day!"
`;






let stack = [{
  'role': 'system',
  'content': systemPrompt
}];

const server = http.createServer(app)
const io = new Server(server);
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};
const setup = (ws) => {
  const deepgram = deepgramClient.listen.live({
    language: "en",
    punctuate: true,
    smart_format: true,
    model: "nova-2-medical",
    endpointing: 600
  });
  //when deepgram is open
  deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
    console.log("deepgram: connected");

    
    //deepgram outputs transcripts  
    deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
      console.log('there is data from', data)
      if (data.is_final && data.channel.alternatives[0].transcript !== "") {
        
        if(count>0){
        if(sid1 !== sid2){
          ws.emit('message',JSON.stringify({'type': 'audio_stop', 'stop': true, count}));
        }}
        count++
        sid1 = count
        pl1++
        ws.emit('message',JSON.stringify({'type': 'audio_session', 'sid1': sid1, count }));

        const words = data.channel.alternatives[0].words;
        const caption = words
            .map((word) => word.punctuated_word ?? word.word)
            .join(" ");
        console.log(caption)
        ws.emit('message',JSON.stringify({'type': 'caption', 'output': JSON.stringify(caption), count}));
        const regex = /disconnect/i;
        if (regex.test(caption)) {
          ws.emit('message',JSON.stringify({'type': 'caption', 'output': JSON.stringify('#assistant stopped#')}));
          deepgram.finish();
          ws.close();
        }
        else {

          const responseText = await getGroqChat(caption, stack);
          // log(`groq response: ${responseText}`)
          const response = await deepgramClient.speak.request(
            { text: responseText },
            {
              model: "aura-asteria-en",
              encoding: "linear16",
              container: "wav",
            }
          );

          console.log(response)
      
          const stream = await response.getStream();
          const headers = await response.getHeaders();
          
          if (!stream) {
            throw new Error("Error generating audio stream");
          }

          if (stream) {
            const buffer = await getAudioBuffer(stream);
            ws.emit('message',{
              'type': 'audio',
              'output': Array.from(new Uint8Array(buffer)),
              'sid1': sid1,
              'sid2': sid2
            });

          } else {
            console.error("Error generating audio:", stream);
          }
        
          if (headers) {
            console.log("Headers:", headers);
          }


        }
      }
  });

    deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
      console.log("deepgram: disconnected");
      log('deepgram: disconnected')
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
      console.log("deepgram: error received");
      console.error(error);
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
      console.log("deepgram: warning received");
      console.warn(warning);
    });

    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("deepgram: packet received");
      console.log("deepgram: metadata received");
      console.log("ws: metadata sent to client");
      ws.emit('message',JSON.stringify({ metadata: data }));
    });
  });

  return deepgram;
}

io.on("connection", (ws) => {
  
  console.log("socket: client connected");
  log('socket: client connected')
  let deepgram = setup(ws);

  ws.on("message", (message) => {
    console.log(message)
    if (deepgram.getReadyState() === 1 /* OPEN */) {
      console.log("socket: sending");
      deepgram.send(message);
    } else if (deepgram.getReadyState() >= 2 /* 2 = CLOSING, 3 = CLOSED */) {
      console.log("socket: data couldn't be sent to deepgram");
      console.log("socket: retrying connection to deepgram");
      log('reattempting to send data')
      /* Attempt to reopen the Deepgram connection */
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = setup(socket);
    } else {
      console.log("socket: data couldn't be sent to deepgram");
    }
  });

  ws.on("close", () => {
    console.log("socket: client disconnected");
    log('socket: client disconnected')
    deepgram.finish();
    deepgram.removeAllListeners();
    deepgram = null;
  });
});

app.use(express.static("public/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});