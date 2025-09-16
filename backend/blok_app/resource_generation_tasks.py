from langchain_huggingface import HuggingFacePipeline
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain.text_splitter import TokenTextSplitter

from langchain.chains.llm import LLMChain
from langchain.chains.combine_documents.map_reduce import MapReduceDocumentsChain, ReduceDocumentsChain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.prompts import PromptTemplate

import time

LLM_MODEL_ID = "HiTZ/Latxa-Llama-3.1-8B-Instruct"

class CustomHuggingFacePipeline(HuggingFacePipeline):
    def get_token_ids(self, text: str) -> list[int]:
        return self.pipeline.tokenizer.encode(text)
    
def generate_note(llm, db, collection_id, file_ids, map_prompt, reduce_prompt, collapse_prompt, custom_conf):
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

    result = map_reduce_chain.invoke({"input_documents": docs, **custom_conf.to_name_value_dict()})
    print(result["output_text"])
    return result["output_text"]

def build_map_prompt(main_prompt, name_singular, custom_conf):
    params = custom_conf.to_name_value_dict()
    customization_prompt = "\n".join(
       f"- {lbl.capitalize()}: {v}" for lbl, v in custom_conf.to_label_value_dict().items()
    )
    return PromptTemplate(
        input_variables=list(params.keys()),
        template=(
            f"{main_prompt}\n"
            "Preserve the language of the original text and strictly follow the customization parameters listed below.\n\n"
            "Customization parameters:\n"
            f"{customization_prompt}\n\n"
            "Passage:\n"
            "{text}\n\n"
            f"{name_singular.capitalize()}:\n\n"
        )
    )

def generate_summary(llm, db, collection_id, file_ids, custom_conf):
    map_prompt = build_map_prompt(
        main_prompt="Summarize the following passage.",
        name_singular="summary",
        custom_conf=custom_conf,
    )
    reduce_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity"],
        template=(
            "You are a helpful assistant. Combine and refine the following summaries into a cohesive global summary. Keep the original language of the summaries. Consider the following customization parameters:\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality}\n"
            "Detail level: {detail}\n"
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
            "Formality: {formality}\n"
            "Detail level: {detail}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Summaries:\n"
            "{text}\n"
            "\n"
            "Collapsed summary:\n"
            "\n"
        )
    )

    res_text = generate_note(llm, db, collection_id, file_ids, map_prompt, reduce_prompt, collapse_prompt, custom_conf)
    db.create_note("title", "summary", res_text, collection_id)

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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
        "language_complexity": language_complexity.value,
    })
    print(result["output_text"])

    db.create_note("title", "faq", result["output_text"], collection_id)

def generate_glossary(llm, db, collection_id, file_ids, detail, language_complexity):
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
            "You are a helpful assistant. Build a glossary from the following passage, where the most significant terms are listed along with their descriptions. Keep the original language of the text. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "{text}\n"
            "\n"
            "Glossary:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "detail_level", "language_complexity"],
        template=(
            "You are a helpful assistant. Combine and refine the following glossaries into a cohesive global cohessive. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Glossaries:\n"
            "{text}\n"
            "\n"
            "Final glossary:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "detail_level", "language_complexity"],
        template=(
            "Shrink the following glossaries into a more concise glossary. Keep the original language of the contents. Consider the following customization parameters:\n"
            "\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Glossaries:\n"
            "{text}\n"
            "\n"
            "Collapsed glossary:\n"
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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
        "language_complexity": language_complexity.value,
    })
    print(result["output_text"])

    db.create_note("title", "glossary", result["output_text"], collection_id)

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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
    })
    print(result["output_text"])

    db.create_note("title", "outline", result["output_text"], collection_id)

def generate_chronogram(llm, db, collection_id, file_ids, detail):
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
            "You are a helpful assistant. Build a chronogram from the following passage. Keep the original language of the text, and consider the customization parameters provided below.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Text:\n"
            "{text}\n"
            "\n"
            "Chronogram:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Combine and refine the following chronograms into a cohesive global chronogram. Keep the original language of the text, and consider the customization parameters provided below.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Chronograms:\n"
            "{text}\n"
            "\n"
            "Final chronogram:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "detail_level"],
        template=(
            "You are a helpful assistant. Shrink the following chronograms into a more concise chronogram. Keep the original language of the text, and consider the customization parameters provided below.\n"
            "\n"
            "Detail level: {detail_level}\n"
            "\n"
            "Chronograms:\n"
            "{text}\n"
            "\n"
            "Collapsed chronogram:\n"
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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
    })
    print(result["output_text"])

    db.create_note("title", "chronogram", result["output_text"], collection_id)

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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "detail_level": detail.value,
    })
    print(result["output_text"])

    db.create_note("title", "mindmap", result["output_text"], collection_id)

def generate_podcast(llm, db, collection_id, file_ids, formality, style, detail, language_complexity, podcast_type):
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
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity", "type"],
        template=(
            "You are a helpful assistant. Generate a {type} podcast script from the contents of the following passage. Keep the original language of the text, considering the customization parameters below. In order to represent the script, you must follow the JSON structure provided below.\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Script format:\n"
            "[\n"
            "  {{ \"speaker\": \"1\", \"text\": \"...\" }},"
            "  {{ \"speaker\": \"2\", \"text\": \"...\" }},"
            "  {{ \"speaker\": \"1\", \"text\": \"...\" }},"
            "  ..."
            "]\n"
            "\n"
            "{text}\n"
            "\n"
            "Podcast script:\n"
            "\n"
        )
    )

    reduce_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity", "type"],
        template=(
            "You are a helpful assistant. Combine and refine the following {type} podcast script into a cohesive global {type} podcast script. Keep the original language of the contents. Consider the customization parameters below.\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Podcast scripts:\n"
            "{text}\n"
            "\n"
            "Final podcast script:\n"
            "\n"
        )
    )

    collapse_prompt = PromptTemplate(
        input_variables=["text", "formality_level", "detail_level", "style", "language_complexity", "type"],
        template=(
            "Shrink the following {type} podcast scripts into a more concise {type} podcast script. Keep the original language of the contents. Consider the customization parameters below.\n"
            "\n"
            "Style: {style}\n"
            "Formality: {formality_level}\n"
            "Detail level: {detail_level}\n"
            "Language complexity: {language_complexity}\n"
            "\n"
            "Podcast scripts:\n"
            "{text}\n"
            "\n"
            "Collapsed podcast script:\n"
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

    result = map_reduce_chain.invoke({
        "input_documents": docs,
        "formality_level": formality.value,
        "detail_level": detail.value,
        "language_complexity": language_complexity.value,
        "style": style.value,
        "type": podcast_type.value,
    })
    print(result["output_text"])

    db.create_note("title", "podcast", result["output_text"], collection_id)
