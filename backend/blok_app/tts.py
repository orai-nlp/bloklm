from backend.config import TTS_PATH, AUDIO_PATH

from pydub import AudioSegment

import subprocess
import tempfile
import json
import os

def parse_script_json(script):
    if type(script) == str and "\"speaker\"" not in script:
        return [{"speaker": "1", "text": script}]
    else:
        try:
            script_content = json.loads(script)
            return script_content
        except json.JSONDecodeError:
            script_content = []
            for ln in script.splitlines():
                script_content.append(json.loads(ln.strip().strip(',')))
            return script_content

def podcast_extract_turns(script):
    script_content = parse_script_json(script)
    turns = []
    last_speaker = None
    for entry in script_content:
        text = entry.get("text", "")
        speaker = entry.get("speaker", "1")
        if last_speaker is None or last_speaker != speaker:
            turns.append(text)
            last_speaker = speaker
        else:
            turns[-1] += " " + text
    return turns

def create_turn_audio(text, lang, speaker, output_wav):
    if lang == "eu":
        voice_fname = "marina_eu" if speaker == 0 else "alex_eu"
        dic_fname = "eu_dicc"
    else: # lang == es
        voice_fname = "laura_es"
        dic_fname = "es_dicc"
    cmd = [
        os.path.join(TTS_PATH, "tts"),
        f"-Lang={lang}",
        "-Method=Vits",
        f"-voice_path={os.path.join(TTS_PATH, voice_fname)}",
        f"-HDic={os.path.join(TTS_PATH, dic_fname)}",
        output_wav
    ]
    subprocess.run(cmd, input=text.encode("iso-8859-1", errors="ignore"), check=True)

def join_audio_files(audio_files, output_fpath):
    combined = AudioSegment.empty()
    for f in audio_files:
        audio = AudioSegment.from_wav(f)
        combined += audio
    combined.export(output_fpath, format="wav")

def generate_podcast_audio(script, lang, note_id):
    turns = podcast_extract_turns(script)
    audio_files = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, turn in enumerate(turns):
            output_wav = f"{tmpdir}/turn_{i}.wav"
            create_turn_audio(turn, lang, i % 2, output_wav)
            audio_files.append(output_wav)

        os.makedirs(AUDIO_PATH, exist_ok=True)
        podcast_fpath = os.path.join(AUDIO_PATH, f"{note_id}.wav")
        join_audio_files(audio_files, podcast_fpath)
    