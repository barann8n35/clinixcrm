---
name: Video Studio
description: Premium + Premium+ video translation module — subtitles, TTS dub, voice cloning, and lip-sync
type: feature
---
Premium "Video Stüdyo" module at /video-studio for health tourism clinics. Two-tier access: `premium` (subtitle + generic TTS dub) and `premium_plus` (adds voice cloning + Sync.so lip-sync).

Pipeline: upload (Supabase Storage clinic-videos bucket, 50MB max) → choose mode → select target languages → process-video-translation edge function orchestrates Gemini transcription → translation with timed segments tool-call → SRT generation always; ElevenLabs eleven_multilingual_v2 (voice George JBFqnCBsd6RMkjVDRZzb default, or user's cloned voice_id) for dub/clone_dub/lipsync modes. For lipsync mode, generate-lipsync edge function submits to Sync.so v2 API (lipsync-2 model) and polls for completion.

Modes: `subtitle` | `dub` | `clone_dub` (Premium+) | `lipsync` (Premium+).

Tables: 
- videos (user_id, original_url, source_language, file_size)
- video_translations (video_id, target_language, mode, status, output_url, subtitle_url, lipsync_url, lipsync_job_id, voice_clone_id, transcript_text)
- voice_clones (user_id, name, elevenlabs_voice_id, sample_url, status: pending|ready|failed) — clone-voice edge function uploads sample to ElevenLabs /v1/voices/add

Realtime enabled on video_translations and voice_clones.

Premium gates: useRole.isPremium = premium|premium_plus|admin. useRole.isPremiumPlus = premium_plus|admin. /video-studio requires isPremium. clone_dub/lipsync modes + Settings → Ses Klonum tab require isPremiumPlus. Admin assigns roles via TeamManagement.

Voice cloning UX: Settings → Ses Klonum tab. User names voice + uploads file OR records via MediaRecorder (audio/webm). Sample uploaded to clinic-videos/{user_id}/voice-samples/, then clone-voice edge function calls ElevenLabs API.

Patient integration: SendVideoDialog component in PatientPanel — lists user's completed translations and inserts WhatsApp message with video link.

Storage path convention: {user_id}/originals/, {user_id}/subtitles/, {user_id}/dubs/, {user_id}/voice-samples/. Signed URLs valid 1 year.

Required secrets: LOVABLE_API_KEY (Gemini transcription/translation), ELEVENLABS_API_KEY (TTS + voice cloning), SYNC_SO_API_KEY (lip-sync only).
