export class AudioRecorder {
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  public audioBlob: Blob | null = null;
  public startTime: number = 0;
  public timeRecorded: number = 0;

  /**
   * Request microphone permissions and initialize the audio stream.
   */
  public async requestPermission(): Promise<void> {
    if (!navigator.mediaDevices) {
      throw new Error("Your browser does not support media device access.");
    }

    if (this.stream) {
      throw new Error("Audio stream is already initialized.");
    }

    this.stream = await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .catch((error) => {
        throw new Error(
          "Unable to access microphone. Permission denied or an error occurred: " +
            (error as Error).message
        );
      });
  }

  /**
   * Start recording audio.
   */
  public async startRecording(): Promise<void> {
    if (this.mediaRecorder) {
      throw new Error("Recording is already in progress.");
    }

    await this.requestPermission().catch((error) => {
      throw new Error("Failed to start recording: " + (error as Error).message);
    });

    this.timeRecorded = 0;
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream!);
    this.startTime = Date.now();

    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      this.audioChunks.push(event.data);
    });

    this.mediaRecorder.start();
  }

  /**
   * Stop recording audio and ensure the audioBlob is available.
   */
  public async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder) {
      throw new Error("No recording is currently in progress.");
    }

    this.timeRecorded = Date.now() - this.startTime;

    return new Promise<Blob>((resolve) => {
      this.mediaRecorder?.addEventListener("stop", () => {
        this.audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve(this.audioBlob);
      });

      this.mediaRecorder?.stop();
      this.mediaRecorder = null;
    }).catch((error) => {
      throw new Error("Failed to stop and process recording: " + error.message);
    });
  }
}
