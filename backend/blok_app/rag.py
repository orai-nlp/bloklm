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

RETRIEVE_FAISS_K = 5
THREAD_ID = "default"

embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
llm = init_chat_model("gpt-4o-mini", model_provider="openai")

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

def generate(state: MessagesState):
    """Generate answer."""
    # Get generated ToolMessages
    recent_tool_messages = []
    for message in reversed(state["messages"]):
        if message.type == "tool":
            recent_tool_messages.append(message)
        else:
            break
    tool_messages = recent_tool_messages[::-1]

    # Format into prompt
    docs_content = "\n\n".join(doc.content for doc in tool_messages)
    system_message_content = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Keep the answer concise."
        "\n\n"
        f"{docs_content}"
    )
    conversation_messages = [
        message for message in state["messages"]
        if message.type in ("human", "system")
        or (message.type == "ai" and not message.tool_calls)
    ]
    prompt = [ SystemMessage(system_message_content) ] + conversation_messages

    # Run
    response = llm.invoke(prompt)
    return {"messages": [response]}
    
def init_collection_graph(collection_id, data):
    collection_vector_store = _load_vector_store(data)
    graph_builder = StateGraph(MessagesState)

    @tool(response_format="content_and_artifact")
    def retrieve(query: str):
        """Retrieve information related to a query."""
        retrieved_docs = collection_vector_store.similarity_search(query, k=RETRIEVE_FAISS_K)
        serialized = "\n\n".join(
            (f"Source: {doc.id}\nContent: {doc.page_content}")
            for doc in retrieved_docs
        )
        return serialized, retrieved_docs
    
    def query_or_respond(state: MessagesState):
        """Generate tool call for retrieval or respond."""
        llm_with_tools = llm.bind_tools([retrieve])
        response = llm_with_tools.invoke(state["messages"])
        # MessagesState appends messages to state instead of overwriting
        return {"messages": [response]}

    tools = ToolNode([retrieve])

    graph_builder.add_node(query_or_respond)
    graph_builder.add_node(tools)
    graph_builder.add_node(generate)

    graph_builder.set_entry_point("query_or_respond")
    graph_builder.add_conditional_edges(
        "query_or_respond",
        tools_condition,
        {END: END, "tools": "tools"},
    )
    graph_builder.add_edge("tools", "generate")
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
            if msg.content:
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
        history.append({
            "role": msg.type,
            "content": msg.content,
        })
    return history

def reset_chat(collection_id):
    graph = collection_graphs.get(collection_id, None)
    if graph:
        graph.checkpointer.delete_thread(THREAD_ID)