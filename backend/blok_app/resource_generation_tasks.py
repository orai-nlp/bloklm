from langchain_huggingface import HuggingFacePipeline
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain.text_splitter import TokenTextSplitter

import os
from langchain.docstore.document import Document
from langchain.chains.llm import LLMChain
from langchain.chains.combine_documents.map_reduce import MapReduceDocumentsChain, ReduceDocumentsChain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.prompts import PromptTemplate

import time

LLM_MODEL_ID = "HiTZ/Latxa-Llama-3.1-8B-Instruct"

class CustomHuggingFacePipeline(HuggingFacePipeline):
    def get_token_ids(self, text: str) -> list[int]:
        return self.pipeline.tokenizer.encode(text)

def generate_summary(llm, db, collection_id, file_ids, formality, style, detail, language_complexity):
    docs = db.get_fitxategiak(collection_id, content=True, file_ids=file_ids)
    texts = [ doc['text'] for doc in docs ]
    
    splitter = TokenTextSplitter(
        chunk_size=8192,
        chunk_overlap=500,
        encoding_name="cl100k_base",  # compatible with LLaMA 3.1 tokenizer
    )
    docs = []
    for text in texts:
        docs.extend(splitter.create_documents([text]))

    lc_llm = CustomHuggingFacePipeline(pipeline=llm)

    map_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity"],
        template=(
            "You are a helpful assistant. Summarize the following passage. Keep the original language of the text. Consider the following customization parameters:\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "{text}\n"
            "\n"
            "Summary:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity"],
        template=(
            "You are a helpful assistant. Combine and refine the following summaries into a cohesive global summary. Keep the original language of the summaries. Consider the following customization parameters:\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Summaries:\n"
            "{text}\n"
            "\n"
            "Final summary:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity"],
        template=(
            "Shrink the following summaries into a more concise summary. Keep the original language of the summaries. Consider the following customization parameters:\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Summaries:\n"
            "{text}\n"
            "\n"
            "Collapsed summary:\n"
            "\n"
        )
    )

    map_chain = LLMChain(llm=lc_llm, prompt=map_prompt, verbose=True)
    reduce_chain = LLMChain(llm=lc_llm, prompt=reduce_prompt, verbose=True)
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain, document_variable_name="text", verbose=True,
    )
    collapse_chain = LLMChain(llm=lc_llm, prompt=collapse_prompt, verbose=True)
    collapse_documents_chain = StuffDocumentsChain(
        llm_chain=collapse_chain, document_variable_name="text", verbose=True
    )
    reduce_documents_chain = ReduceDocumentsChain(
        combine_documents_chain=combine_documents_chain,
        collapse_documents_chain=collapse_documents_chain,
        token_max=8192,
        verbose=True,
    )
    map_reduce_chain = MapReduceDocumentsChain(
        llm_chain=map_chain,
        reduce_documents_chain=reduce_documents_chain,
        document_variable_name="text",
        verbose=True,
    )

    summary = map_reduce_chain.invoke({
        "input_documents": docs,
        "formality_level": formality.value,
        "detail_level": detail.value,
        "language_complexity": language_complexity.value,
        "style": style.value,
    })
    print(summary["output_text"])

    db.create_note("title", "summary", summary["output_text"], collection_id)

def generate_faq(llm, db, collection_id, file_ids, detail, language_complexity):
    docs = db.get_fitxategiak(collection_id, content=True, file_ids=file_ids)
    texts = [ doc['text'] for doc in docs ]
    
    splitter = TokenTextSplitter(
        chunk_size=8192,
        chunk_overlap=500,
        encoding_name="cl100k_base",  # compatible with LLaMA 3.1 tokenizer
    )
    docs = []
    for text in texts:
        docs.extend(splitter.create_documents([text]))

    lc_llm = CustomHuggingFacePipeline(pipeline=llm)

    map_prompt = PromptTemplate(
        input_variables=["text", "detail_level", "language_complexity"],
        template=(
            "You are a helpful assistant. Build a FAQ from the following passage. Keep the original language of the text. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "{text}\n"
            "\n"
            "FAQ:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "detail_level", "language_complexity"],
        template=(
            "You are a helpful assistant. Combine and refine the following FAQs into a cohesive global FAQ. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "FAQs:\n"
            "{text}\n"
            "\n"
            "Final FAQ:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "detail_level", "language_complexity"],
        template=(
            "Shrink the following FAQs into a more concise FAQ. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "FAQs:\n"
            "{text}\n"
            "\n"
            "Collapsed FAQ:\n"
            "\n"
        )
    )

    map_chain = LLMChain(llm=lc_llm, prompt=map_prompt, verbose=True)
    reduce_chain = LLMChain(llm=lc_llm, prompt=reduce_prompt, verbose=True)
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain, document_variable_name="text", verbose=True,
    )
    collapse_chain = LLMChain(llm=lc_llm, prompt=collapse_prompt, verbose=True)
    collapse_documents_chain = StuffDocumentsChain(
        llm_chain=collapse_chain, document_variable_name="text", verbose=True
    )
    reduce_documents_chain = ReduceDocumentsChain(
        combine_documents_chain=combine_documents_chain,
        collapse_documents_chain=collapse_documents_chain,
        token_max=8192,
        verbose=True,
    )
    map_reduce_chain = MapReduceDocumentsChain(
        llm_chain=map_chain,
        reduce_documents_chain=reduce_documents_chain,
        document_variable_name="text",
        verbose=True,
    )

    summary = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
        "language_complexity": language_complexity.value,
    })
    print(summary["output_text"])

    db.create_note("title", "faq", summary["output_text"], collection_id)

def generate_outline(llm, db, collection_id, file_ids, detail):
    docs = db.get_fitxategiak(collection_id, content=True, file_ids=file_ids)
    texts = [ doc['text'] for doc in docs ]
    
    splitter = TokenTextSplitter(
        chunk_size=8192,
        chunk_overlap=500,
        encoding_name="cl100k_base",  # compatible with LLaMA 3.1 tokenizer
    )
    docs = []
    for text in texts:
        docs.extend(splitter.create_documents([text]))

    lc_llm = CustomHuggingFacePipeline(pipeline=llm)

    map_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Build an outline of the following passage. Keep the original language of the text. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "{text}\n"
            "\n"
            "Outline:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Combine and refine the following outlines into a cohesive global outline. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Outlines:\n"
            "{text}\n"
            "\n"
            "Final outline:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "Shrink the following outlines into a more concise outline. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Outlines:\n"
            "{text}\n"
            "\n"
            "Collapsed outline:\n"
            "\n"
        )
    )

    map_chain = LLMChain(llm=lc_llm, prompt=map_prompt, verbose=True)
    reduce_chain = LLMChain(llm=lc_llm, prompt=reduce_prompt, verbose=True)
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain, document_variable_name="text", verbose=True,
    )
    collapse_chain = LLMChain(llm=lc_llm, prompt=collapse_prompt, verbose=True)
    collapse_documents_chain = StuffDocumentsChain(
        llm_chain=collapse_chain, document_variable_name="text", verbose=True
    )
    reduce_documents_chain = ReduceDocumentsChain(
        combine_documents_chain=combine_documents_chain,
        collapse_documents_chain=collapse_documents_chain,
        token_max=8192,
        verbose=True,
    )
    map_reduce_chain = MapReduceDocumentsChain(
        llm_chain=map_chain,
        reduce_documents_chain=reduce_documents_chain,
        document_variable_name="text",
        verbose=True,
    )

    summary = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
    })
    print(summary["output_text"])

    db.create_note("title", "outline", summary["output_text"], collection_id)

def generate_mind_map(llm, db, collection_id, file_ids, detail):
    docs = db.get_fitxategiak(collection_id, content=True, file_ids=file_ids)
    texts = [ doc['text'] for doc in docs ]
    
    splitter = TokenTextSplitter(
        chunk_size=8192,
        chunk_overlap=500,
        encoding_name="cl100k_base",  # compatible with LLaMA 3.1 tokenizer
    )
    docs = []
    for text in texts:
        docs.extend(splitter.create_documents([text]))

    lc_llm = CustomHuggingFacePipeline(pipeline=llm)

    map_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Build a mind map of the following passage. Keep the original language of the text, and consider the following customization parameters. Provide the graph representation of the mind map following the JSON structure provided below.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "JSON structure:\n"
            "{{\n"
            "  \"nodes\": [\n"
            "    {{\"id\": \"1\", \"label\": \"Artificial Intelligence\" }},\n"
            "    {{\"id\": \"2\", \"label\": \"Machine Learning\" }},\n"
            "    {{\"id\": \"3\", \"label\": \"Neural Networks\" }}\n"
            "  ],\n"
            "  \"edges\": [\n"
            "    {{\"source\": \"1\", \"target\": \"2\", \"relation\": \"includes\" }},\n"
            "    {{\"source\": \"2\", \"target\": \"3\", \"relation\": \"includes\" }}\n"
            "  ]\n"
            "}}\n"
            "\n"
            "Text:\n"
            "{text}\n"
            "\n"
            "Mind map:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Combine and refine the following mind maps into a cohesive global mind map. Keep the original language of the text, and consider the following customization parameters. Keep the original JSON format to represent the graph.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Mind maps:\n"
            "{text}\n"
            "\n"
            "Final mind map:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Shrink the following mind maps into a more concise mind map. Keep the original language of the text, and consider the following customization parameters. Keep the original JSON format to represent the graph.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Mind maps:\n"
            "{text}\n"
            "\n"
            "Collapsed mind map:\n"
            "\n"
        )
    )

    map_chain = LLMChain(llm=lc_llm, prompt=map_prompt, verbose=True)
    reduce_chain = LLMChain(llm=lc_llm, prompt=reduce_prompt, verbose=True)
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain, document_variable_name="text", verbose=True,
    )
    collapse_chain = LLMChain(llm=lc_llm, prompt=collapse_prompt, verbose=True)
    collapse_documents_chain = StuffDocumentsChain(
        llm_chain=collapse_chain, document_variable_name="text", verbose=True
    )
    reduce_documents_chain = ReduceDocumentsChain(
        combine_documents_chain=combine_documents_chain,
        collapse_documents_chain=collapse_documents_chain,
        token_max=8192,
        verbose=True,
    )
    map_reduce_chain = MapReduceDocumentsChain(
        llm_chain=map_chain,
        reduce_documents_chain=reduce_documents_chain,
        document_variable_name="text",
        verbose=True,
    )

    summary = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
    })
    print(summary["output_text"])

    db.create_note("title", "mindmap", summary["output_text"], collection_id)