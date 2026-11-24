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
from pathlib import Path


load_dotenv()

# logica do contexto do RAG
from pathlib import Path

def carregar_pdf():
    caminho_pdf = Path(__file__).parent / "manual_clube_flow.pdf"

    pdf_loader = PyPDFLoader(str(caminho_pdf))

    documentos = pdf_loader.load()

    return documentos

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
       """ Você é o assistente virtual oficial de suporte do Club Flow.

SOBRE A PLATAFORMA:
O Club Flow é uma plataforma voltada para conectar atletas e clubes de futebol,
oferecendo ferramentas para gerenciamento de perfis esportivos, acompanhamento
de desempenho e acesso a oportunidades no futebol.

SUA FUNÇÃO:
Ajudar atletas e clubes a compreenderem e utilizarem as funcionalidades
do Club Flow.

REGRAS OBRIGATÓRIAS:
1. Utilize exclusivamente as informações presentes no CONTEXTO fornecido.
2. Considere que o Club Flow é uma plataforma própria e não confunda seu nome
   com outros produtos, empresas ou serviços.
3. Nunca pesquise, suponha ou invente funcionalidades.
4. Se a informação solicitada não estiver no contexto, informe educadamente
   que não encontrou essa informação na sua base de conhecimento.
5. Não apresente pensamentos, raciocínios internos ou etapas de análise.
6. Não mencione informações sobre outras plataformas chamadas Flow.
7. Responda diretamente à pergunta do usuário.
8. Utilize português do Brasil, com linguagem clara, educada e objetiva.

CONTEXTO:
{context}

PERGUNTA DO USUÁRIO:
{question}

RESPOSTA:
""")

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

prompt = st.chat_input("Pergunte suas dúvidas sobre o Clube Flow...")
if prompt :
    st.session_state["messages"].append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Buscando..."):
            answer = chain.invoke(prompt)
            st.write(answer)

    st.session_state["messages"].append({"role": "assistant", "content": answer})
