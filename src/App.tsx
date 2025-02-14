import { useState, useRef } from "react";
import { Client } from "@gradio/client";
import Siriwave from "react-siriwave";
import { AudioRecorder } from "@/recording";
import { CogIcon, PlusIcon, StopCircle, Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function Microphone() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(true);
  const [chatflowId, setChatflowId] = useState<string | null>(null);
  const [sessionID, setSessionID] = useState<string>(
    Math.random().toString(36).substring(7)
  );
  const [speechRate, setSpeechRate] = useState(0); // -50 to 50 %
  const [speechPitch, setSpeechPitch] = useState(0); // -20 to 20 Hz
  const [selectedVoice, setSelectedVoice] = useState(
    "en-US-RogerNeural - en-US (Male)"
  );
  const voices = [
    "en-CA-ClaraNeural - en-CA (Female)",
    "en-US-AndrewMultilingualNeural - en-US (Male)",
    "en-US-BrianNeural - en-US (Male)",
    "en-GB-LibbyNeural - en-GB (Female)",
    "en-US-RogerNeural - en-US (Male)",
    "en-US-MichelleNeural - en-US (Female)",
    "en-US-GuyNeural - en-US (Male)",
    "en-US-BrianMultilingualNeural - en-US (Male)",
    "en-US-SteffanNeural - en-US (Male)",
    "en-US-AvaNeural - en-US (Female)",
    "en-GB-ThomasNeural - en-GB (Male)",
    "en-US-EmmaNeural - en-US (Female)",
    "en-GB-MaisieNeural - en-GB (Female)",
    "en-CA-LiamNeural - en-CA (Male)",
    "en-GB-SoniaNeural - en-GB (Female)",
    "en-AU-WilliamNeural - en-AU (Male)",
    "en-US-EmmaMultilingualNeural - en-US (Female)",
    "en-US-AriaNeural - en-US (Female)",
    "en-US-AndrewNeural - en-US (Male)",
    "en-GB-RyanNeural - en-GB (Male)",
    "en-US-AnaNeural - en-US (Female)",
    "en-US-ChristopherNeural - en-US (Male)",
    "en-US-JennyNeural - en-US (Female)",
    "en-AU-NatashaNeural - en-AU (Female)",
    "en-US-EricNeural - en-US (Male)",
    "en-US-AvaMultilingualNeural - en-US (Female)",
  ];

  const audioRecorder = useRef<AudioRecorder>(new AudioRecorder());

  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      await audioRecorder.current.startRecording();
    } catch (err) {
      setError((err as Error).message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      const audioBlob = await audioRecorder.current.stopRecording();

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const payload = {
          question: "",
          chatId: sessionID,
          uploads: [
            {
              data: base64Audio,
              type: "audio",
              name: "audio.webm",
              mime: "audio/webm",
            },
          ],
        };

        setLoading(true);

        try {
          const response = await fetch(
            `https://llminabox.criticalfutureglobal.com/api/v1/prediction/${chatflowId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const chatCompletion = await response.json();

          const app = await Client.connect(
            "https://critical-hf-cpu-tts.hf.space"
          );
          const prediction = await app.predict("/predict", {
            text: chatCompletion.text,
            voice: selectedVoice,
            rate: speechRate,
            pitch: speechPitch,
          });

          // @ts-ignore
          const audioElement = new Audio(prediction.data[0].url);

          // When audio starts playing, update the caption if needed
          audioElement.addEventListener("playing", () => {
            setCaption(chatCompletion.text);
          });

          // When audio ends naturally, remove the caption and clear the audio element
          audioElement.addEventListener("ended", () => {
            setCaption(null);
            setAudio(null);
          });

          setAudio(audioElement);
          audioElement.play();
        } catch (err) {
          setError("Failed to process audio: " + (err as Error).message);
        }

        setLoading(false);
      };
    } catch (err) {
      setError((err as Error).message);
      setIsRecording(false);
      setLoading(false);
    }
  };

  // Modified stop function to also clear the audio state,
  // so that the UI can switch back to showing the mic button.
  const stopAudioPlayback = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setCaption(null);
      setAudio(null);
    }
  };

  // Determines if audio is playing using the audio element properties.
  const isAudioPlaying = () =>
    audio &&
    audio.currentTime > 0 &&
    !audio.paused &&
    !audio.ended &&
    audio.readyState > 2;

  const newConversation = () => {
    setSessionID(Math.random().toString(36).substring(7));
    setCaption(null);
    setError(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white relative flex flex-col">
      <div className="absolute top-4 right-4 flex space-x-4 z-50">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="p-2">
              <CogIcon className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Chatflow ID</label>
                <input
                  type="text"
                  value={chatflowId || ""}
                  onChange={(e) => setChatflowId(e.target.value)}
                  className="border rounded p-2 bg-gray-700 text-white"
                  placeholder="Enter Chatflow ID"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 font-medium">Voice</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="border rounded p-2 bg-gray-700 text-white">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 font-medium">
                  Speech Rate ({speechRate}%)
                </label>
                <Slider
                  value={[speechRate]}
                  onValueChange={(value) => setSpeechRate(value[0])}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 font-medium">
                  Speech Pitch ({speechPitch} Hz)
                </label>
                <Slider
                  value={[speechPitch]}
                  onValueChange={(value) => setSpeechPitch(value[0])}
                  min={-20}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Save</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={newConversation} variant="ghost" className="p-2">
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>

      <main className="flex-grow flex flex-col justify-between items-center">
        <div className="w-full flex justify-center items-center h-1/2">
          <Siriwave theme="ios9" autostart={isAudioPlaying() || isRecording} />
        </div>

        <div className="w-full flex flex-col items-center mb-10">
          {caption && (
            <div className="mb-4 p-6 text-xl text-center">{caption}</div>
          )}

          {isAudioPlaying() ? (
            <button
              onClick={stopAudioPlayback}
              className="w-24 h-24 cursor-pointer"
            >
              <StopCircle className="h-12 w-12 fill-red-400" />
            </button>
          ) : (
            <button
              className={`flex justify-center items-center w-24 h-24 ${
                isLoading || !chatflowId
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={isRecording ? stopRecording : undefined}
              disabled={isLoading || !chatflowId}
            >
              <Mic
                className={` ${
                  isRecording
                    ? "fill-red-400 drop-shadow-glowRed"
                    : !chatflowId
                    ? "fill-gray-600"
                    : ""
                }`}
                size={64}
              />
            </button>
          )}

          {!chatflowId && !isAudioPlaying() && (
            <div className="mt-2 text-sm text-red-400 text-center">
              No Chatflow ID provided. Please click the settings icon to enter
              one.
            </div>
          )}
          {error && (
            <div className="mt-4 p-2 text-red-500 text-sm">{error}</div>
          )}
          {isLoading && (
            <div className="mt-4 p-2 text-blue-400">Processing audio...</div>
          )}
        </div>
      </main>
    </div>
  );
}
