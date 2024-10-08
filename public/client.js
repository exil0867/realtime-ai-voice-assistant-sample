document.addEventListener('DOMContentLoaded', async () => {
  let captions = window.document.getElementById("captions");
  let audioElement = document.getElementById('myAudio');
  let audioQueue = [];
  let isPlaying = false;
  
  const socket = io();

  socket.on("connect", async () => {
    await start(socket);
  });

  socket.on("message", (data) => {
    if (data.type === 'audio') {
      const audioData = data.output;
      const audioBuffer = new Uint8Array(audioData);

      // Convert the audio data to a Blob
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      // Add to queue
      audioQueue.push(audioUrl);
      
      // Attempt to play if nothing else is playing
      if (!isPlaying) {
        playNextSegment();
      }
    }
  });

  socket.on("close", () => {
    console.log("WebSocket connection closed");
  });

  async function playNextSegment() {
    if (audioQueue.length === 0) {
      isPlaying = false;
      return; // No more segments to play
    }

    const nextAudioUrl = audioQueue.shift();
    const audio = new Audio(nextAudioUrl);
    isPlaying = true;
    
    audio.play();
    audio.onended = () => {
      isPlaying = false;
      playNextSegment(); // Play the next queued segment
    };

    audio.onerror = () => {
      console.error('Failed to play audio segment');
      isPlaying = false;
      playNextSegment(); // Skip this segment if there's an error
    };
  }

  async function start(socket) {
    const listenButton = document.querySelector("#record");
    let microphone;

    listenButton.addEventListener("click", async () => {
      if (!microphone) {
        try {
          microphone = await getMicrophone();
          await openMicrophone(microphone, socket);
        } catch (error) {
          console.error("Error opening microphone:", error);
        }
      } else {
        await closeMicrophone(microphone);
        microphone = undefined;
      }
    });
  }

  async function getMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return new MediaRecorder(stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }

  async function openMicrophone(microphone, socket) {
    return new Promise((resolve) => {
      microphone.onstart = () => {
        console.log("WebSocket connection opened");
        document.body.classList.add("recording");
        resolve();
      };

      microphone.onstop = () => {
        console.log("WebSocket connection closed");
        document.body.classList.remove("recording");
      };

      microphone.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.connected) {
          socket.emit('message', event.data);
        }
      };

      microphone.start(1000);
    });
  }

  async function closeMicrophone(microphone) {
    microphone.stop();
  }
});
