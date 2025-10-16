from typing import List
import asyncio
import logging

from langchain.chat_models import init_chat_model
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
import numpy as np
import faiss
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
from langgraph.graph import MessagesState, StateGraph
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.graph import END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import BaseMessage

RETRIEVE_FAISS_K = 5
THREAD_ID = "default"
MAX_CONTEXT_MSGS = 10  # Number of previous messages (human+ai) to include in context
MAX_CONTEXT_MSGS_QR = 6  # Number of previous messages (human+system) to include in context for query rewriting

embedding_model = None
llm = None

collection_graphs = {}

def split_and_vectorize(fids, contents):
    orig_docs = []
    for fid, content in zip(fids, contents):
        orig_docs.append(Document(
            page_content=content,
            metadata={"file_id": fid},
        ))

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200, add_start_index=True)
    split_docs = text_splitter.split_documents(orig_docs)

    embeddings = embedding_model.embed_documents([ doc.page_content for doc in split_docs ])

    docs = []
    for split_doc, emb in zip(split_docs, embeddings):
        docs.append({
            "content": split_doc.page_content,
            "file_id": split_doc.metadata["file_id"],
            "start_index": split_doc.metadata["start_index"],
            "embedding": emb,
        })

    return docs

def _load_vector_store(data: List[dict]):
    if not data:
        raise ValueError("No documents provided")
    ids, texts, embeddings = zip(*[ (doc['id'], doc['content'], doc['emb']) for doc in data ])
    embedding_dim = len(embeddings[0])
    collection_id = data[0]["collection_id"]

    index = faiss.IndexFlatL2(embedding_dim)
    vector_store = FAISS(
        embedding_function=embedding_model,
        index=index,
        docstore=InMemoryDocstore(),
        index_to_docstore_id={},
    )
    vector_store.add_embeddings(
        text_embeddings=zip(texts, embeddings),
        ids=ids,
    )

    return vector_store

# RAG graph
    
def init_collection_graph(collection_id, data):
    collection_vector_store = _load_vector_store(data)
    graph_builder = StateGraph(MessagesState)
    
    def rewrite_query(state: MessagesState):
        """Add context to the latest user query."""
        system_message_content = (
            "You are a query rewriter for a retrieval-augmented generation (RAG) system. "
            "Your task is to rewrite the user's latest query into a self-contained, "
            "contextually complete question that captures all relevant details from the conversation history. "
            "The rewritten query should be clear, concise, and optimized for document retrieval — not for answering directly."
        )
        conversation_messages = [
            message for message in state["messages"]
            if message.type in ("human", "ai")
        ]
        prompt = [ SystemMessage(system_message_content) ] + conversation_messages[-MAX_CONTEXT_MSGS_QR:]
        response = llm.invoke(prompt)
        message = BaseMessage(
            type="query_rewriting",
            content=response.content
        )
        return {"messages": [message]}

    def retrieve(state: MessagesState):
        """Always run retrieval in Python, append to state."""
        # Extract latest user query (rewritten)
        last_user_message = next(
            (m for m in reversed(state["messages"]) if m.type == "query_rewriting"), None
        )
        query_text = last_user_message.content if last_user_message else ""

        # Run retrieval
        retrieved_docs = collection_vector_store.similarity_search(query_text, k=RETRIEVE_FAISS_K)
        retrieved_text = "\n\n".join(
            (f"Source ID: {doc.id}\nContent: {doc.page_content}")
            for doc in retrieved_docs
        )

        # Append as a BaseMessage for generate() to consume
        base_message = BaseMessage(
            type="retrieval",
            content=retrieved_text,
            metadata={"retrieved_docs": retrieved_docs},
        )
        return {"messages": [base_message]}

    def generate(state: MessagesState):
        """Generate answer."""
        context = next(
            (m for m in reversed(state["messages"]) if m.type == "retrieval"), None
        )
        context = context.content if context else ""
        system_message_content = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question. "
            "If you don't know the answer, say that you don't know. "
            "Always respond in the same language as the question. "
            "Keep the answer concise.\n"
            "Always cite the relevant sources in the answer, including the Source IDs. "
            "Insert inline citations like [SID:Source_ID].\n"
            "\n"
            f"{context}\n"
        )
        conversation_messages = [
            message for message in state["messages"]
            if message.type == "human" or (message.type == "ai" and not message.tool_calls)
        ]
        prompt = [ SystemMessage(system_message_content) ] + conversation_messages[-MAX_CONTEXT_MSGS:]

        response = llm.invoke(prompt)
        return {"messages": [response]}
    
    graph_builder.add_node(rewrite_query)
    graph_builder.add_node(retrieve)
    graph_builder.add_node(generate)

    graph_builder.set_entry_point("rewrite_query")
    graph_builder.add_edge("rewrite_query", "retrieve")
    graph_builder.add_edge("retrieve", "generate")
    graph_builder.add_edge("generate", END)

    collection_graphs[collection_id] = graph_builder.compile(checkpointer=MemorySaver())

async def query(query, collection_id):
    graph = collection_graphs[collection_id]
    for msg, metadata in graph.stream(
        { "messages": [{"role": "user", "content": query}] },
        stream_mode="messages",
        config={"configurable": {"thread_id": THREAD_ID}},
    ):
        if metadata["langgraph_node"] in ["generate", "query_or_respond"]:
            if msg.content and msg.type != "retrieval":
                yield msg.content
                await asyncio.sleep(0)

def chat_history(collection_id):
    graph = collection_graphs.get(collection_id, None)
    if not graph:
        logging.warning(f"Graph of the collection {collection_id} not found when retrieving chat history")
        return []
    state = graph.get_state({"configurable": {"thread_id": THREAD_ID}})
    if "messages" not in state.values or not isinstance(state.values["messages"], list):
        logging.warning(f"Graph state of the collection {collection_id} is empty or not valid when retrieving chat history")
        return []
    history = []
    for msg in state.values["messages"]:
        if msg.type in ["human", "ai"]:
            history.append({
                "role": msg.type,
                "content": msg.content,
            })
    return history

def reset_chat(collection_id):
    graph = collection_graphs.get(collection_id, None)
    if graph:
        graph.checkpointer.delete_thread(THREAD_ID)