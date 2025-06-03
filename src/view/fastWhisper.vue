<template>
  <div>
    <button @click="startRecording">🎤 开始录音</button>
    <button @click="stopRecording">🛑 停止并识别</button>
    <p>识别结果：{{ result }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      ws: null,
      mediaRecorder: null,
      audioChunks: [],
      result: ""
    };
  },
  methods: {
    async startRecording() {
      this.result = "";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start();

      this.ws = new WebSocket("ws://localhost:8765");

      this.ws.onopen = () => {
        console.log("WebSocket connected");
      };

      this.ws.onmessage = (event) => {
        this.result = event.data;
      };

      this.ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    },

    async stopRecording() {
      if (!this.mediaRecorder) return;

      this.mediaRecorder.stop();

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.audioChunks, { type: "audio/webm" });
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const arrayBuffer = await blob.arrayBuffer();
          this.ws.send(arrayBuffer);
          this.ws.send("END");
        }
        this.mediaRecorder = null;
      };
    }
  }
};
</script>
