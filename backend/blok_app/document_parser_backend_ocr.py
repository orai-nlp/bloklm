from collections import namedtuple
import os
import io
# from werkzeug.datastructures import FileStorage
import chardet
import tempfile

import subprocess



from pathlib import Path
import olefile
import docx2txt
from docx import Document
import time
from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from docling.datamodel.base_models import InputFormat, DocumentStream
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    PipelineOptions,
)
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
from docling.document_converter import (
    DocumentConverter,
    PdfFormatOption,
    WordFormatOption,
)
from docling.pipeline.simple_pipeline import SimplePipeline
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling.datamodel.settings import settings

class SanicFileAdapter:
    """
    Adapts a Sanic File object so it can be consumed by
    extract_text_from_document which expects a Flask-style FileStorage.
    """
    def __init__(self, sanic_file):
        # sanic_file: File(type='...', body=b'...', name='...')
        self.stream = io.BytesIO(sanic_file.body)   # readable file-like
        self.filename = sanic_file.name
        self.content_type = sanic_file.type

    # The parser only needs .read(), .seek(), .filename and the extension
    def read(self, *args, **kwargs):
        return self.stream.read(*args, **kwargs)

    def seek(self, pos, whence=io.SEEK_SET):
        return self.stream.seek(pos, whence)

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, value):
        self._filename = value

    # Helpers the original parser uses
    @property
    def name(self):
        return self.filename
    
def extract_from_documents(files) -> list[dict]:
    """
    Extract text from various document types (PDF, DOC/DOCX, TXT, SRT, WAV, MP3)
    
    Args:
        file: FileStorage object from Flask request.files
        
    Returns a list the following:
        dict: {
            'success': bool,
            'text': str,
            'filename': str,
            'file_type': str,
            'error': str (if success=False)
        }
    """
    ocr_list = []
    doc_list = []
    audio_list = []
    manual_list = []
    for f in files:
        f_type = f.type.lower().split('/')[-1]
        if f_type in ['pdf', 'vnd.openxmlformats-officedocument.wordprocessingml.document']:
            ocr_list.append(f)
        elif f_type in ['ms-doc', 'doc', 'msword']:
            doc_list.append(f)
        elif f_type in ['mp3', 'wav']:
            audio_list.append(f)
        else:
            manual_list.append(f)

    return_list = list(map(extract_text_from_document, manual_list))
    return_list += extract_text_from_documents_DOC(doc_list)
    return_list += extract_text_from_documents_with_ocr(ocr_list)

    return return_list


def extract_text_from_documents_DOC(files):
    converted_list = []
    FakeSanicFile = namedtuple('FakeSanicFile', 'body name type')
    
    for file in files:
        print('Extract text from DOC files:', file.name)

        pdf_bytes = doc_bytes_to_pdf_bytes(file.body)

        converted_list.append(FakeSanicFile(            
                    body=pdf_bytes,
                    name=file.name.replace('.doc', '.pdf'),
                    type='application/pdf')
        )

    emaitz =  [{
    'success': f['success'],
    'text': f['text'],
    'filename': f['filename'].replace(".pdf", ".doc"),
    'file_type': 'DOC',
    'error': f['error']
            } for f in extract_text_from_documents_with_ocr(converted_list)]

    return emaitz

def extract_text_from_documents_with_ocr(files) -> list[dict]:
    
    processed_files = []

    # --- 1. Adapt the Sanic file ---
    # ERROR
    if not files:
        return processed_files
    
    formated_files = [DocumentStream(name= file.name, stream= io.BytesIO(file.body)) for file in files]

    # Enable the profiling to measure the time spent
    settings.debug.profile_pipeline_timings = True

    ## ACC OPTIONS
    accelerator_options_CPU = AcceleratorOptions(
        num_threads=8, device=AcceleratorDevice.CPU
    )

    accelerator_options_GPU = AcceleratorOptions(
        num_threads=8, device=AcceleratorDevice.CUDA
    )

    # STANDARD CONFIG
    std_pipeline_opt = PipelineOptions(accelerator_options = accelerator_options_CPU)

    # SETTINGS PDF
    pipeline_options_pdf = PdfPipelineOptions()
    pipeline_options_pdf.accelerator_options = accelerator_options_GPU
    pipeline_options_pdf.do_ocr = True
    pipeline_options_pdf.do_table_structure = True
    pipeline_options_pdf.table_structure_options.do_cell_matching = True

    # DOC CONVERTER
    doc_converter = (
            DocumentConverter(  # all of the below is optional, has internal defaults.
                allowed_formats=[
                    InputFormat.PDF,
                    InputFormat.DOCX,
                ],  # whitelist formats, non-matching files are ignored.
                format_options={
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_cls=StandardPdfPipeline, backend=PyPdfiumDocumentBackend, pipeline_options=pipeline_options_pdf,
                    ),
                    InputFormat.DOCX: WordFormatOption(
                        pipeline_cls=SimplePipeline, pipeline_options = std_pipeline_opt 
                    ),
                },
            )
        )
    conv_results = doc_converter.convert_all(formated_files)


    try:
        # Global conversion row
        for res in conv_results:
            p = res.input.file
            print('Reading file with ocr: ', p.name)
            
            # Extract timing from ProfilingItem
            try:
                profiling_item = res.timings["pipeline_total"]
                # The ProfilingItem has a 'times' list with the actual timing values
                real_processing_time = profiling_item.times[0]
                    
            except Exception as e:
                real_processing_time = 0.0

            # export timing (still measured by us if you want it)
            start = time.time()
            md = res.document.export_to_markdown()
            exp_time = time.time() - start
            
            print(f'Processing time OCR for file {p.name}: {real_processing_time}. And markdown export: {exp_time}')

            processed_files.append({
                'success': True,
                'text': md,
                'filename': p.name,
                'file_type': p.suffix.lower(),
                'error': ''
            })
    except Exception as e:
        print('Error while processing files with OCR: ', e)
        return []

    return processed_files



def extract_text_from_document(file) -> dict:
    """
    Extract text from various document types (TXT, SRT)
    
    Args:
        file: FileStorage object from Flask request.files
        
    Returns:
        dict: {
            'success': bool,
            'text': str,
            'filename': str,
            'file_type': str,
            'error': str (if success=False)
        }
    """
    # --- 1. Adapt the Sanic file ---
    file = SanicFileAdapter(file)
    
    # ERROR
    if not file or not file.filename:
        return {
            'success': False,
            'text': '',
            'filename': '',
            'file_type': '',
            'error': 'No file provided'
        }
    
    # INIT
    filename = file.filename
    file_extension = os.path.splitext(filename)[1].lower()
    print('Extracting text from stardard file: ', filename)
    try:
        # Read file content into memory
        file_content = file.read()
        file.seek(0)  # Reset file pointer for potential reuse
        
        # Determine file type and extract text
        if file_extension == '.txt':
            text = _extract_txt_text(file_content)
            file_type = 'TXT'
            
        elif file_extension == '.srt':
            text = _extract_srt_text(file_content)
            file_type = 'SRT'
            
        else:
            return {
                'success': False,
                'text': '',
                'filename': filename,
                'file_type': file_extension,
                'error': f'Unsupported file type: {file_extension}'
            }
        return {
            'success': True,
            'text': text,
            'filename': filename,
            'file_type': file_type,
            'error': ''
        }
        
    except Exception as e:
        return {
            'success': False,
            'text': '',
            'filename': filename,
            'file_type': file_extension,
            'error': f'Error processing file: {str(e)}'
        }

# DOC formatutik testua lortzeko
def doc_bytes_to_pdf_bytes(doc_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory(dir='.') as td:
        tdir = Path(td)
        doc_path = tdir / "in.doc"
        pdf_path = tdir / "in.pdf"

        doc_path.write_bytes(doc_bytes)

        subprocess.run([
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(tdir),
            str(doc_path)
        ], check=True)

        return pdf_path.read_bytes()

# TXT formatutik testua lortzeko, encoding kasuak kasu
def _extract_txt_text(file_content: bytes) -> str:
    """Extract text from TXT file with encoding detection"""
    try:
        # Detect encoding
        detected = chardet.detect(file_content)
        encoding = detected['encoding'] or 'utf-8'
        
        # Decode with detected encoding
        text = file_content.decode(encoding)
        
    except Exception as e:
        # Fallback to common encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                text = file_content.decode(encoding)
                break
            except:
                continue
        else:
            raise Exception(f"Could not decode text file: {str(e)}")
    
    return text.strip()

# SRT formatutik testua lortzeko
def _extract_srt_text(file_content: bytes) -> str:
    """Extract text from SRT subtitle file"""
    try:
        # Detect encoding
        detected = chardet.detect(file_content)
        encoding = detected['encoding'] or 'utf-8'
        
        # Decode content
        content = file_content.decode(encoding)
        
        # Parse SRT format
        text = ""
        lines = content.strip().split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                i += 1
                continue
            
            # Skip subtitle numbers (digits only)
            if line.isdigit():
                i += 1
                continue
            
            # Skip timestamp lines (contain -->)
            if '-->' in line:
                i += 1
                continue
            
            # This should be subtitle text
            text += line + " "
            i += 1
            
    except Exception as e:
        raise Exception(f"Error extracting SRT text: {str(e)}")
    
    return text.strip()


# Requirements to install:
# pip install PyPDF2 python-docx chardet flask

# Flask usage
"""

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    result = extract_text_from_document(file)
    
        
    if result['success']:
        return jsonify({
            'success': True,
            'text': result['text'],
            'filename': result['filename'],
            'file_type': result['file_type']
        })
    else:
        return jsonify({
            'success': False,
            'error': result['error']
        }), 400

"""