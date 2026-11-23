"""
Assistente RAG de Políticas Internas (RH)
- Streamlit (interface)
- LangChain com LCEL (orquestração)
- FAISS (banco vetorial)
- Ollama (embeddings + LLM)
"""

# Sistema RAG
# Embeddings

import streamlit as st
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser


load_dotenv()

# logica do contexto do RAG
def carregar_pdf(): # ler o pdf e extrair o texto do pdf
    pdf_loader = PyPDFLoader("manual_clube_flow.pdf")
    texto = pdf_loader.load()
    return texto

texto_pdf = carregar_pdf()

def separar_em_blocos(texto_pdf):
    separador = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200)
    lista_blocos = separador.split_documents(texto_pdf)
    return lista_blocos

# print(texto_pdf)
lista_blocos = separar_em_blocos(texto_pdf)
# print(len(lista_blocos))
# print(lista_blocos[0])
# print(lista_blocos[1])

# Embedding
def criar_banco_vetores(lista_blocos):
    ferramenta_embedding = OllamaEmbeddings(model="qwen3-embedding:0.6b")
    banco_vetores = FAISS.from_documents(lista_blocos, ferramenta_embedding)
    return banco_vetores

banco_vetores = criar_banco_vetores(lista_blocos)

# logica do agente de IA
def criar_chain_agente(banco_vetores):

    prompt_template = ChatPromptTemplate.from_template(
        """Você é o assistente virtual de suporte do Club Flow, uma plataforma voltada para atletas e clubes de futebol.

Sua função é ajudar os usuários a entenderem e utilizarem as funcionalidades da plataforma, esclarecendo dúvidas sobre cadastro, perfil, desempenho, agenda, gamificação, oportunidades, rede social e demais recursos disponíveis.

Use APENAS as informações presentes no contexto fornecido para elaborar suas respostas. Não invente funcionalidades, procedimentos ou informações que não estejam documentados.

Se não encontrar informações suficientes no contexto para responder, informe claramente que não sabe a resposta e oriente o usuário a entrar em contato com o suporte do Club Flow.

Responda sempre em português do Brasil, utilizando uma linguagem clara, objetiva, educada e acessível. Adapte suas explicações para que atletas e clubes consigam compreender facilmente as orientações.

    Contexto: {context}

    A pergunta: {question}

    Resposta:""")

    buscador_contexto = banco_vetores.as_retriever()

    llm = ChatOllama(model="qwen3.5:0.8b", reasoning=False)

    chain = ({"context": buscador_contexto, "question": RunnablePassthrough()} 
             | prompt_template 
             | llm
             | StrOutputParser())
    
    return chain




# interface

st.title("Assistente RAG — Manual do Club Flow")

# carregar chain e vector store
chain = criar_chain_agente(banco_vetores)


# inicia a lista de mensagens
if "messages" not in st.session_state:
    st.session_state["messages"] = []

# exibe as mensagens na tela
for msg in st.session_state["messages"]:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

prompt = st.chat_input("Pergunte sobre as políticas da empresa...")
if prompt :
    st.session_state["messages"].append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Buscando..."):
            answer = chain.invoke(prompt)
            st.write(answer)

    st.session_state["messages"].append({"role": "assistant", "content": answer})
