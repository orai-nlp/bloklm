from pydub import AudioSegment

import subprocess
import tempfile
import json
import os

TTSDIR = "/home/zbeloki/tmp/ahotts"
PODCAST_DIR = "/home/zbeloki/workspace/bloklm.git/podcasts"

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

def create_turn_audio(text, speaker, output_wav):
    voice_fname = "marina_eu" if speaker == 0 else "alex_eu"
    cmd = [
        os.path.join(TTSDIR, "tts"),
        "-Lang=eu",
        "-Method=Vits",
        f"-voice_path={os.path.join(TTSDIR, voice_fname)}",
        f"-HDic={os.path.join(TTSDIR, 'eu_dicc')}",
        output_wav
    ]
    subprocess.run(cmd, input=text.encode("iso-8859-1"), check=True)

def join_audio_files(audio_files, output_fpath):
    combined = AudioSegment.empty()
    for f in audio_files:
        audio = AudioSegment.from_wav(f)
        combined += audio
    combined.export(output_fpath, format="wav")

def generate_podcast_audio(script, note_id):
    turns = podcast_extract_turns(script)
    audio_files = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, turn in enumerate(turns):
            output_wav = f"{tmpdir}/turn_{i}.wav"
            create_turn_audio(turn, i % 2, output_wav)
            audio_files.append(output_wav)

        os.makedirs(PODCAST_DIR, exist_ok=True)
        podcast_fpath = os.path.join(PODCAST_DIR, f"{note_id}.wav")
        join_audio_files(audio_files, podcast_fpath)
    