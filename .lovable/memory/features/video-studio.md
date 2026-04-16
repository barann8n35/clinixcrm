---
name: Video Studio
description: Premium video translation module for health tourism — multi-language subtitles + ElevenLabs TTS dubbing
type: feature
---
Premium "Video Stüdyo" module at /video-studio for health tourism clinics.
Pipeline: upload (Supabase Storage clinic-videos bucket, 50MB max) → choose mode (subtitle SRT or TTS dub) → select target languages (preset chips: AR/EN/RU/DE/FR/FA/ES + custom code/label) → edge function process-video-translation orchestrates Gemini transcription → translation with timed segments tool-call → SRT generation always; ElevenLabs eleven_multilingual_v2 (voice George JBFqnCBsd6RMkjVDRZzb) for dub mode.
Tables: videos (user_id, original_url, source_language, file_size), video_translations (video_id, target_language, mode, status, output_url, subtitle_url, transcript_text). Realtime enabled on video_translations for live progress.
Premium gate: useRole.isPremium = roles.includes('premium') || isAdmin. Non-premium users see upgrade screen. Admin assigns premium via TeamManagement role select.
Patient integration: SendVideoDialog component in PatientPanel — lists user's completed translations and inserts WhatsApp message with video link.
Storage path convention: {user_id}/originals/, {user_id}/subtitles/, {user_id}/dubs/. Signed URLs valid 1 year.
ELEVENLABS_API_KEY required only for dub mode; subtitle mode works with LOVABLE_API_KEY only.
