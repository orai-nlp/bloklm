from langchain.prompts import PromptTemplate
from langchain.text_splitter import TokenTextSplitter

from langchain.chains.llm import LLMChain
from langchain.chains import SequentialChain
from langchain.chains.combine_documents.map_reduce import MapReduceDocumentsChain, ReduceDocumentsChain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.prompts import PromptTemplate

import time

CHUNK_SIZE = 8192
CHUNK_OVERLAP = 500

class PromptBuilder:

    def __init__(self, map_main_prompt, name_singular, name_plural, custom_conf=None, reduce_main_prompt=None):
        self.map_main_prompt = map_main_prompt
        self.name_singular = name_singular
        self.name_plural = name_plural
        self.customization_params = {}
        self.customization_prompt = ""
        if custom_conf:
            self.customization_params = custom_conf.to_name_value_dict()
            customization_params_prompt = "\n".join(
                f"- {lbl.capitalize()}: {v}" for lbl, v in custom_conf.to_label_value_dict().items()
            )
            self.customization_prompt = (
                "Customization parameters:\n"
                f"{customization_params_prompt}"
            )
        # reduce prompt
        self.reduce_main_prompt = f"Combine and refine the following {self.name_plural} into a cohesive global {self.name_singular}."
        if reduce_main_prompt:
            self.reduce_main_prompt = reduce_main_prompt

    def build_map_prompt(self):
        return PromptTemplate(
            input_variables=list(self.customization_params.keys()),
            template=(
                f"{self.map_main_prompt}\n"
                "Preserve the language of the original text and strictly follow the customization parameters listed below, if provided.\n\n"
                f"{self.customization_prompt}\n\n"
                f"Return only the requested {self.name_singular}. Do not add any explanations, comments, or extra text.\n\n"
                "Passage:\n"
                "{text}\n\n"
                f"{self.name_singular.capitalize()}:\n"
            )
        )

    def build_reduce_prompt(self):
        return PromptTemplate(
            input_variables=list(self.customization_params.keys()),
            template=(
                f"{self.reduce_main_prompt}\n"
                "Preserve the language of the original text and strictly follow the customization parameters listed below, if provided. Also, maintain the format of the input content.\n\n"
                f"{self.customization_prompt}\n\n"
                f"Return only the requested {self.name_singular}. Do not add any explanations, comments, or extra text.\n\n"
                f"{self.name_plural.capitalize()}:\n"
                "{text}\n\n"
                f"Final {self.name_singular}:\n"
            )
        )

    def build_collapse_prompt(self):
        return PromptTemplate(
            input_variables=list(self.customization_params.keys()),
            template=(
                f"Shrink the following {self.name_plural} into a more concise {self.name_singular}.\n"
                "Preserve the language of the original text and strictly follow the customization parameters listed below, if provided. Also, maintain the format of the input content.\n\n"
                f"{self.customization_prompt}\n\n"
                f"Return only the requested {self.name_singular}. Do not add any explanations, comments, or extra text.\n\n"
                f"{self.name_plural.capitalize()}:\n"
                "{text}\n\n"
                f"Collapsed {self.name_singular}:\n"
            )
        )
    
def retrieve_docs(db, collection_id, file_ids):
    docs = db.get_fitxategiak(collection_id, content=True, file_ids=file_ids)
    if not docs:
        raise ValueError("No content provided")
    texts = [ doc['text'] for doc in docs ]
    
    splitter = TokenTextSplitter(
        chunk_size=8192,
        chunk_overlap=500,
        encoding_name="cl100k_base",  # compatible with LLaMA 3.1 tokenizer
    )
    docs = []
    for text in texts:
        docs.extend(splitter.create_documents([text]))
    return docs

def create_map_reduce_chain(llm, map_prompt, reduce_prompt, collapse_prompt, output_key="output_text"):
    map_chain = LLMChain(llm=llm, prompt=map_prompt, verbose=True)
    reduce_chain = LLMChain(llm=llm, prompt=reduce_prompt, verbose=True)
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain,
        document_variable_name="text",
        verbose=True,
    )
    collapse_chain = LLMChain(llm=llm, prompt=collapse_prompt, verbose=True)
    collapse_documents_chain = StuffDocumentsChain(
        llm_chain=collapse_chain,
        document_variable_name="text",
        verbose=True
    )
    reduce_documents_chain = ReduceDocumentsChain(
        combine_documents_chain=combine_documents_chain,
        collapse_documents_chain=collapse_documents_chain,
        verbose=True,
    )
    return MapReduceDocumentsChain(
        llm_chain=map_chain,
        reduce_documents_chain=reduce_documents_chain,
        document_variable_name="text",
        verbose=True,
        output_key=output_key,
    )

def generate_note_title(llm, db, note_type, note_content, collection_id):
    collection = db.get_bilduma(collection_id)
    prompt_template = PromptTemplate(
        input_variables=["collection_title", "collection_summary", "note_type", "note_content"],
        template=(
            "Based on the following note, generate a concise and descriptive title.\n"
            "The note is part of a collection with the following title and summary. Use this information to create a more relevant title.\n\n"
            "Return only the requested title. Do not add any explanations, comments, or extra text.\n\n"
            "Collection title: {collection_title}\n"
            "Collection summary: {collection_summary}\n"
            "Note type: {note_type}\n"
            "Note content:\n"
            "{note_content}\n\n"
            "Title:"
        )
    )
    chain = LLMChain(llm=llm, prompt=prompt_template)
    title = chain.invoke({
        "collection_title": collection.get("title", ""),
        "collection_summary": collection.get("summary", ""),
        "note_type": note_type,
        "note_content": note_content,
    })
    return title["text"].strip().strip('"')

def generate_note(llm, db, collection_id, file_ids, prompter, custom_conf):
    docs = retrieve_docs(db, collection_id, file_ids)

    map_prompt = prompter.build_map_prompt()
    reduce_prompt = prompter.build_reduce_prompt()
    collapse_prompt = prompter.build_collapse_prompt()

    chain = create_map_reduce_chain(llm, map_prompt, reduce_prompt, collapse_prompt, output_key="output_text")
    result = chain.invoke({"input_documents": docs, **custom_conf.to_name_value_dict()})
    print((
        "--------------------\n"
        f"{result['output_text']}\n"
        "--------------------"
    ))
    return result["output_text"]

def generate_headings(llm, db, collection_id, file_ids):
    docs = retrieve_docs(db, collection_id, file_ids)
    prompter = PromptBuilder(
        map_main_prompt="Summarize the following passage.",
        reduce_main_prompt="Combine and refine the following summaries into a short cohesive global summary of a single paragraph.",
        name_singular="summary",
        name_plural="summaries",
    )
    title_prompt = PromptTemplate(
        input_variables=["summary"],
        template=(
            "Based on the following summary, generate a concise and descriptive title:\n\n"
            "{summary}\n\n"
            "Return only the requested title. Do not add any explanations, comments, or extra text.\n\n"
            "Title:"
        )
    )
    name_prompt = PromptTemplate(
        input_variables=["summary"],
        template=(
            "You are provided a summary of a collection of files. Based on the summary, generate a concise and descriptive name for the collection. It should be only a few words long.\n\n"
            "Summary:\n"
            "{summary}\n\n"
            "Return only the requested name. Do not add any explanations, comments, or extra text.\n\n"
            "Name:"
        )
    )
    summary_chain = create_map_reduce_chain(llm, prompter.build_map_prompt(), prompter.build_reduce_prompt(), prompter.build_collapse_prompt(), output_key="summary")
    title_chain = LLMChain(llm=llm, prompt=title_prompt, output_key="title")
    name_chain = LLMChain(llm=llm, prompt=name_prompt, output_key="name")
    chain = SequentialChain(
        chains=[summary_chain, title_chain, name_chain],
        input_variables=["input_documents"],   # same input as map_reduce_chain
        output_variables=["summary", "title", "name"]   # summary + generated title
    )
    result = chain.invoke({"input_documents": docs})
    return result["name"].strip('"'), result["title"].strip('"'), result["summary"].strip('"')

def generate_summary(llm, db, collection_id, file_ids, custom_conf):
    prompter = PromptBuilder(
        map_main_prompt="Summarize the following passage.",
        name_singular="summary",
        name_plural="summaries",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

def generate_faq(llm, db, collection_id, file_ids, custom_conf):
    prompter = PromptBuilder(
        map_main_prompt="Build a FAQ from the following passage.",
        name_singular="FAQ",
        name_plural="FAQs",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

def generate_glossary(llm, db, collection_id, file_ids, custom_conf):
    prompter = PromptBuilder(
        map_main_prompt="Build a glossary from the following passage, where the most significant terms are listed along with their descriptions.",
        name_singular="glossary",
        name_plural="glossaries",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

def generate_outline(llm, db, collection_id, file_ids, custom_conf):
    prompter = PromptBuilder(
        map_main_prompt="Build an outline of the following passage.",
        name_singular="outline",
        name_plural="outlines",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

def generate_chronogram(llm, db, collection_id, file_ids, custom_conf):
    prompter = PromptBuilder(
        map_main_prompt="Build a chronogram from the following passage.",
        name_singular="chronogram",
        name_plural="chronograms",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

# TODO: validate created mindmap's JSON structure
def generate_mind_map(llm, db, collection_id, file_ids, custom_conf):
    main_prompt = (
        "Build a mind map of the following passage.\n"
        "Provide the graph representation of the mind map following the JSON structure provided below. "
        "The graph should not contain more than 30 nodes.\n\n"
        "JSON structure of the output:\n"
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
        "}}"
    )
    reduce_main_prompt = (
        f"Combine and refine the following mind maps into a cohesive and concise global mind map. "
        "If the content is too long, shorten it to be as brief as possible while keeping the main content."
    )
    prompter = PromptBuilder(
        map_main_prompt=main_prompt,
        reduce_main_prompt=reduce_main_prompt,
        name_singular="mind map",
        name_plural="mind maps",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)

# TODO: validate created podcast's JSON structure
def generate_podcast_script(llm, db, collection_id, file_ids, custom_conf):
    podcast_type = custom_conf.to_name_value_dict()['podcast_type']
    main_prompt = (
        f"Generate a {podcast_type} podcast script from the contents of the following passage.\n"
        "In order to represent the script, you must follow the JSON structure provided below.\n\n"
        "Script format:\n"
        "[\n"
        "  {{ \"speaker\": \"1\", \"text\": \"...\" }},\n"
        "  {{ \"speaker\": \"2\", \"text\": \"...\" }},\n"
        "  {{ \"speaker\": \"1\", \"text\": \"...\" }},\n"
        "  ...\n"
        "]"
    )
    prompter = PromptBuilder(
        map_main_prompt=main_prompt,
        name_singular=f"{podcast_type} podcast script",
        name_plural=f"{podcast_type} podcast scripts",
        custom_conf=custom_conf,
    )
    return generate_note(llm, db, collection_id, file_ids, prompter, custom_conf)
