import tempfile
from pathlib import Path
import nemo.collections.asr as nemo_asr
from pydub import AudioSegment
import librosa
import numpy as np
import io

# Global model instances (load once at application startup)
_asr_model_eu = None
_asr_model_es = None

def initialize_asr_models(model_path_eu, model_path_es):
    """
    Initialize both ASR models (Basque and Spanish) once at application startup.
    
    Args:
        model_path_eu (str): Path to the Basque .nemo model file
        model_path_es (str): Path to the Spanish .nemo model file
    """
    global _asr_model_eu, _asr_model_es
    if _asr_model_eu is None:
        _asr_model_eu = nemo_asr.models.EncDecRNNTBPEModel.restore_from(model_path_eu)
    if _asr_model_es is None:
        _asr_model_es = nemo_asr.models.EncDecRNNTBPEModel.restore_from(model_path_es)
    return _asr_model_eu, _asr_model_es


def detect_language_from_file(audio_file_path):
    """
    Mock function to detect language from audio file path.
    
    Args:
        audio_file_path (str): Path to the audio file
    
    Returns:
        str: Language code ('eu' for Basque or 'es' for Spanish)
    """
    # TODO: Implement actual language detection logic
    pass


def detect_language_from_array(audio_array, sample_rate):
    """
    Mock function to detect language from numpy audio array.
    
    Args:
        audio_array (np.ndarray): Audio data as numpy array
        sample_rate (int): Sample rate of the audio
    
    Returns:
        str: Language code ('eu' for Basque or 'es' for Spanish)
    """
    # TODO: Implement actual language detection logic
    pass


def convert_audio_to_wav(audio_bytes, source_format):
    """
    Convert audio bytes to 16kHz mono WAV format required by the model.
    Only converts if the source format is not already WAV.
    
    Args:
        audio_bytes (bytes): Raw audio file bytes
        source_format (str): Source audio format (e.g., 'mp3', 'wav', 'ogg')
    
    Returns:
        bytes: WAV audio bytes at 16kHz mono
    """
    try:
        # Remove the dot if present (e.g., '.mp3' -> 'mp3')
        source_format = source_format.lstrip('.')
        
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=source_format)
        
        # Convert to 16kHz mono (even for WAV files to ensure correct format)
        audio = audio.set_frame_rate(16000).set_channels(1)
        
        # Export to WAV format
        wav_buffer = io.BytesIO()
        audio.export(wav_buffer, format='wav')
        wav_buffer.seek(0)
        
        return wav_buffer.read()
    
    except Exception as e:
        raise Exception(f"Audio conversion failed: {str(e)}")


def extract_text_from_audio(file_obj, model_path_eu=None, model_path_es=None):
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
        if _asr_model_eu is None or _asr_model_es is None:
            if model_path_eu is None or model_path_es is None:
                raise ValueError("Models not initialized. Provide model paths or call initialize_asr_models() first.")
            initialize_asr_models(model_path_eu, model_path_es)
        
        # Extract basic info
        filename = file_obj.name
        file_type = Path(filename).suffix.lower()  # e.g., '.mp3' or '.wav'
        audio_bytes = file_obj.body
        
        # Convert audio to required format (16kHz mono WAV)
        wav_bytes = convert_audio_to_wav(audio_bytes, file_type)
        
        # Save converted audio to a temporary WAV file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            tmp.write(wav_bytes)
            tmp_path = Path(tmp.name)
        
        # Language detection - Option 1: Using temporary file path
        detected_language = detect_language_from_file(str(tmp_path))
        
        # Language detection - Option 2: Using numpy array with librosa (commented)
        # audio_array, sample_rate = librosa.load(str(tmp_path), sr=16000, mono=True)
        # detected_language = detect_language_from_array(audio_array, sample_rate)
        
        # Select the appropriate model based on detected language
        if detected_language == 'eu':
            asr_model = _asr_model_eu
        elif detected_language == 'es':
            asr_model = _asr_model_es
        else:
            raise ValueError(f"Unsupported language detected: {detected_language}")
        
        # Transcribe using the selected NeMo ASR model
        # Model expects a list of file paths
        transcriptions = asr_model.transcribe(
            audio=[str(tmp_path)],
            batch_size=1
        )
        
        # Extract transcription text (returns list, get first element)
        transcription_text = transcriptions[0] if transcriptions else ""
        
        # Cleanup temporary file
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        
        return {
            'success': True,
            'text': transcription_text,
            'filename': filename,
            'file_type': file_type,
            'language': detected_language,
            'error': ''
        }
    
    except Exception as e:
        # Cleanup temporary file in case of error
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        
        return {
            'success': False,
            'text': '',
            'filename': getattr(file_obj, 'name', ''),
            'file_type': getattr(Path(getattr(file_obj, 'name', '')), 'suffix', '').lower() if hasattr(file_obj, 'name') else '',
            'language': '',
            'error': str(e)
        }