import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AudioRecorderButtonProps {
  clubId?: string;
  contextHint?: string;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  compact?: boolean;
  allowUpload?: boolean;
}

function pickSupportedAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'audio/webm';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AudioRecorderButton({
  clubId,
  contextHint,
  onTranscript,
  onError,
  compact = false,
  allowUpload = false,
}: AudioRecorderButtonProps) {
  const { apiFetch } = useAuth();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [localError, setLocalError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const reportError = (msg: string) => {
    setLocalError(msg);
    onError?.(msg);
  };

  const sendAudioForTranscription = async (blob: Blob, rawMimeType: string) => {
    setTranscribing(true);
    setLocalError('');
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read recorded audio data.'));
        reader.readAsDataURL(blob);
      });

      const cleanMime = rawMimeType.split(';')[0] || 'audio/webm';
      const endpoint = clubId ? `/api/clubs/${clubId}/ai/transcribe` : '/api/ai/transcribe';
      const res = await apiFetch<{ transcript: string; modelUsed: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          clubId,
          base64Data,
          mimeType: cleanMime,
          contextHint,
        }),
      });
      if (!res.transcript) {
        reportError('No speech detected in the audio clip.');
      } else {
        onTranscript(res.transcript);
      }
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Audio transcription failed.');
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    setLocalError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reportError('Microphone recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedAudioMime();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (audioBlob.size > 0) {
          void sendAudioForTranscription(audioBlob, mimeType);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setElapsedSec(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      reportError(
        err instanceof Error
          ? `Microphone permission error: ${err.message}`
          : 'Microphone access was denied.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void sendAudioForTranscription(file, file.type || 'audio/mpeg');
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex items-center gap-2">
        {!recording ? (
          <button
            type="button"
            disabled={transcribing}
            onClick={() => void startRecording()}
            title="Record voice note for transcription (gemini-3.5-transcribe)"
            className={`inline-flex items-center gap-1.5 font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              compact
                ? 'px-2.5 py-1.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50'
                : 'px-3.5 py-2 text-xs text-white bg-[#004B87] border-[#004B87] hover:bg-[#003865]'
            }`}
          >
            {transcribing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{compact ? 'Dictate' : 'Record Voice Note'}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
            <span className="font-mono-tabular">{formatDuration(elapsedSec)}</span>
          </button>
        )}

        {allowUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={recording || transcribing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Audio</span>
            </button>
          </>
        )}
      </div>

      {localError && !onError && (
        <span className="text-[11px] text-red-700">{localError}</span>
      )}
    </div>
  );
}
