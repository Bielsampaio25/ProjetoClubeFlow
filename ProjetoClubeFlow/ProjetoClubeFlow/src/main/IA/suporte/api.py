
from fastapi import FastAPI
from pydantic import BaseModel
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

app = FastAPI(title="API de Suporte Club Flow")


class Pergunta(BaseModel):
    mensagem: str


def carregar_pdf():
    caminho_pdf = Path(__file__).parent / "manual_clube_flow.pdf"
    pdf_loader = PyPDFLoader(str(caminho_pdf))
    return pdf_loader.load()


def criar_banco_vetores():
    documentos = carregar_pdf()

    separador = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    blocos = separador.split_documents(documentos)

    embeddings = OllamaEmbeddings(
        model="qwen3-embedding:0.6b"
    )

    return FAISS.from_documents(blocos, embeddings)


def criar_chain_agente(banco_vetores):

    prompt_template = ChatPromptTemplate.from_template("""
Você é o assistente virtual oficial de suporte do Club Flow.

Utilize exclusivamente as informações presentes no contexto.
Não invente funcionalidades.
Se não encontrar a resposta, informe educadamente que não
encontrou essa informação na base de conhecimento.
Responda em português do Brasil, de maneira clara e objetiva.
Não apresente pensamentos ou raciocínios internos.

CONTEXTO:
{context}

PERGUNTA:
{question}

RESPOSTA:
""")

    buscador_contexto = banco_vetores.as_retriever()

    llm = ChatOllama(
        model="qwen3.5:0.8b",
        reasoning=False
    )

    chain = (
        {
            "context": buscador_contexto,
            "question": RunnablePassthrough()
        }
        | prompt_template
        | llm
        | StrOutputParser()
    )

    return chain


# Inicializa o banco e o modelo uma única vez
banco_vetores = criar_banco_vetores()
chain = criar_chain_agente(banco_vetores)


@app.get("/")
def inicio():
    return {"mensagem": "API de suporte do Club Flow funcionando!"}


@app.post("/perguntar")
def perguntar(pergunta: Pergunta):

    if not pergunta.mensagem.strip():
        return {"resposta": "Digite uma pergunta para continuar."}

    try:
        resposta = chain.invoke(pergunta.mensagem)

        return {
            "resposta": resposta
        }

    except Exception as erro:
        print("Erro ao consultar IA:", erro)

        return {
            "resposta": "Não foi possível consultar o assistente neste momento."
        }