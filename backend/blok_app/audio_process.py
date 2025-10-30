from backend.config import ASR

from speechbrain.inference.classifiers import EncoderClassifier
from langchain.prompts import SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate
from pydub import AudioSegment
import numpy as np

import tempfile
from pathlib import Path
import io

SAMPLE_RATE = 16000

# Global model instances (load once at application startup)
_asr_model_eu = None
_asr_model_es = None
_language_id_model = None
_llm = None

def initialize_asr_models():
    """
    Initialize both ASR models (Basque and Spanish) once at application startup.
    
    Args:
        model_path_eu (str): Path to the Basque .nemo model file
        model_path_es (str): Path to the Spanish .nemo model file
    """
    global _asr_model_eu, _asr_model_es, _language_id_model
    # Nemo is imported here to avoid the error "Start method 'spawn' was requested, but 'fork' was already set"
    import nemo.collections.asr as nemo_asr
    if _asr_model_eu is None:
        _asr_model_eu = nemo_asr.models.EncDecRNNTBPEModel.restore_from(ASR["EU"], map_location=ASR["DEVICE"])
    if _asr_model_es is None:
        _asr_model_es = nemo_asr.models.EncDecRNNTBPEModel.restore_from(ASR["ES"], map_location=ASR["DEVICE"])
    if _language_id_model is None:
        _language_id_model = EncoderClassifier.from_hparams(
            source=ASR["LANG_ID"],
            savedir="tmp",
            run_opts={"device": "cpu"}
        )
    return _asr_model_eu, _asr_model_es, _language_id_model

def detect_language_from_array(wav_bytes, sample_rate):
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        tmp.write(wav_bytes)
        tmp_path = Path(tmp.name)

        signal = _language_id_model.load_audio(str(tmp_path))
        language_prediction = _language_id_model.classify_batch(signal)[-1][0]
    return "es" if language_prediction.startswith("es") else "eu"

def convert_audio_to_wav(audio_bytes, source_format):
    """
    Convert audio bytes to 16kHz mono WAV format required by the model.
    Only converts if the source format is not already WAV.
    
    Args:
        audio_bytes (bytes): Raw audio file bytes
        source_format (str): Source audio format (e.g., 'mp3', 'wav', 'ogg')
    
    Returns:
        chunks_bytes: a list of WAV audio bytes at 16kHz mono (split into 30s chunks)
    """
    try:
        # Remove the dot if present (e.g., '.mp3' -> 'mp3')
        source_format = source_format.lstrip('.')
        
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=source_format)
        
        # Convert to 16kHz mono (even for WAV files to ensure correct format)
        audio = audio.set_frame_rate(SAMPLE_RATE).set_channels(1)

        # Split audio into chunks
        CHUNK_LENGTH = 30  # seconds
        chunk_length_ms = CHUNK_LENGTH * 1000
        chunks = [audio[i:i + chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
        
        # Export to WAV format
        chunks_bytes = []
        for chunk in chunks:
            wav_buffer = io.BytesIO()
            chunk.export(wav_buffer, format='wav')
            wav_buffer.seek(0)
            chunks_bytes.append(wav_buffer.read())

        return chunks_bytes

    except Exception as e:
        raise Exception(f"Audio conversion failed: {str(e)}")
    
def _extract_text_from_audio_chunk(wav_bytes, lang):
    # Save converted audio to a temporary WAV file
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        tmp.write(wav_bytes)
        tmp_path = Path(tmp.name)

        # Select the appropriate model based on detected language
        if lang == 'eu':
            asr_model = _asr_model_eu
        elif lang == 'es':
            asr_model = _asr_model_es
        else:
            raise ValueError(f"Unsupported language detected: {lang}")
        
        # Transcribe using the selected NeMo ASR model
        # Model expects a list of file paths
        transcription = asr_model.transcribe(
            audio=[str(tmp_path)],
            batch_size=1
        )
        if type(transcription) == list:
            transcription = transcription[0]
        if type(transcription) != str:
            transcription = transcription.text
        return transcription
    
def add_punctuation_to_text(plain_text, lang):
    if _llm is None:
        raise RuntimeError("LLM model is not initialized for punctuation.")
    
    system_prompt = SystemMessagePromptTemplate.from_template(
        "You are an expert linguistic model specialized in adding punctuation, proper capitalization and line breaks to texts in {language}.\n"
    )
    user_prompt = HumanMessagePromptTemplate.from_template(
        "Add appropriate punctuation, capitalization and line breaks to the following {language} text:\n\n"
        "{text}\n\n"
        "Return only the corrected text without any additional commentary."
    )
    chat_prompt = ChatPromptTemplate.from_messages([system_prompt, user_prompt])
    prompt = chat_prompt.format_messages(text=plain_text, language=lang)
    response = _llm.invoke(prompt)
    return response.content

def extract_text_from_audio(file_obj):
    """
    Process an uploaded audio file (from Sanic request) and transcribe it using NeMo ASR.

    Args:
        file_obj (sanic.request.form.File): Uploaded audio file.
        model_path_eu (str, optional): Path to Basque .nemo model file. Only needed if model not initialized.
        model_path_es (str, optional): Path to Spanish .nemo model file. Only needed if model not initialized.

    Returns:
        dict: {
            'success': bool,
            'text': str,
            'filename': str,
            'file_type': str,
            'language': str,
            'error': str
        }
    """
    global _asr_model_eu, _asr_model_es
    tmp_path = None
    
    try:
        # Initialize models if not already loaded
        if _asr_model_eu is None or _asr_model_es is None or _language_id_model is None:
            initialize_asr_models()
        
        # Extract basic info
        filename = file_obj.name
        file_type = Path(filename).suffix.lower()  # e.g., '.mp3' or '.wav'
        audio_bytes = file_obj.body
        
        # Convert audio to required format (16kHz mono WAV)
        wavs_bytes = convert_audio_to_wav(audio_bytes, file_type)
        
        # Detect language from the first chunk
        lang = detect_language_from_array(wavs_bytes[0], SAMPLE_RATE)

        chunk_texts = []
        for wav_bytes in wavs_bytes:
            chunk_text = _extract_text_from_audio_chunk(wav_bytes, lang)
            chunk_texts.append(chunk_text)

        plain_text = ' '.join(chunk_texts)
        formatted_text = add_punctuation_to_text(plain_text, lang=lang)

        return {
            'success': True,
            'text': formatted_text,
            'filename': filename,
            'file_type': file_type,
            'language': lang,
            'error': ''
        }
    
    except Exception as e:
        # Cleanup temporary file in case of error
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise Exception(f"Error occurred during audio processing: {str(e)}")
