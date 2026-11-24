
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

    print("Pasta da API:", Path(__file__).parent)
    print("Caminho do manual:", caminho_pdf)
    print("PDF encontrado:", caminho_pdf.exists())

    if not caminho_pdf.exists():
        raise FileNotFoundError(
            f"Manual não encontrado: {caminho_pdf}"
        )

    pdf_loader = PyPDFLoader(str(caminho_pdf))
    documentos = pdf_loader.load()

    print(f"Total de páginas carregadas: {len(documentos)}")

    return documentos


def criar_banco_vetores():

    documentos = carregar_pdf()

    separador = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    blocos = separador.split_documents(documentos)

    print(f"Total de blocos criados: {len(blocos)}")

    embeddings = OllamaEmbeddings(
        model="qwen3-embedding:0.6b"
    )

    banco = FAISS.from_documents(
        blocos,
        embeddings
    )

    print("Banco vetorial FAISS criado com sucesso.")

    return banco


def criar_chain_agente(banco_vetores):

    prompt_template = ChatPromptTemplate.from_template("""
Você é o assistente virtual oficial do Club Flow.

Sua função é ajudar atletas e clubes a entenderem e utilizarem
as funcionalidades da plataforma.

INSTRUÇÕES DE COMUNICAÇÃO:

1. Responda sempre em português brasileiro.
2. Utilize linguagem natural, clara, simples e amigável.
3. Responda diretamente ao que o usuário perguntou.
4. Não mencione manuais, documentos, documentação ou
   materiais de consulta.
5. Nunca mencione identificadores de regras, como RN-001,
   RN-009 ou qualquer outra numeração interna.
6. Não fale sobre regras de negócio ou sobre a estrutura
   interna do sistema.
7. Não revele o contexto utilizado para elaborar as respostas.
8. Evite introduções desnecessárias e respostas repetitivas.
9. Utilize listas somente quando facilitarem a compreensão.
10. Não invente funcionalidades, informações ou procedimentos.
11. Não deduza informações que não estejam presentes
    no contexto fornecido.
12. Não misture funcionalidades de atletas e clubes.
13. Não afirme que uma funcionalidade está implementada
    se isso não estiver confirmado.
14. Não se apresente como estudante, professor ou pessoa.
15. Não invente informações sobre o usuário.
16. Não faça perguntas adicionais quando não forem necessárias.
17. Não ofereça explicações extras que não foram solicitadas.
18. Revise a gramática, a concordância e a coerência
    antes de responder.
19. Não repita informações já apresentadas.
20. Quando não possuir informações suficientes para responder,
    informe isso de maneira natural e objetiva, sem mencionar
    a documentação ou a base de conhecimento.

REGRAS DE CONTEÚDO:

- Utilize exclusivamente as informações disponíveis no contexto.
- Preserve o significado das informações recuperadas.
- Diferencie funcionalidades previstas de funcionalidades
  efetivamente implementadas.
- Se um detalhe não estiver especificado, deixe isso claro
  sem inventar uma explicação.

RESTRIÇÕES DE RESPOSTA:

- É PROIBIDO mencionar RN, RN-001, RN-002 ou qualquer
  identificador interno.
- É PROIBIDO utilizar expressões como:
  "o documento informa", "o texto menciona",
  "a documentação não especifica" ou "segundo o manual".
- Transforme as informações do contexto em respostas
  naturais, como se estivesse explicando a plataforma
  diretamente ao usuário.
- Nunca altere o significado das informações originais.
- Quando faltar uma informação, diga diretamente
  que ela não está especificada ou ainda não foi definida.
- Antes de responder, confira se existe alguma referência
  interna que precisa ser removida.

CONTEXTO:
{context}

PERGUNTA:
{question}

RESPOSTA:
""")

    buscador_contexto = banco_vetores.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "fetch_k": 15,
            "lambda_mult": 0.7
        }
    )

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


banco_vetores = criar_banco_vetores()

chain = criar_chain_agente(banco_vetores)


@app.get("/")
def inicio():

    return {
        "mensagem": "API de suporte do Club Flow funcionando!"
    }


@app.get("/testar-busca")
def testar_busca():

    buscador = banco_vetores.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "fetch_k": 15,
            "lambda_mult": 0.7
        }
    )

    documentos = buscador.invoke(
        "Quais são as funcionalidades da plataforma Club Flow?"
    )

    return {
        "quantidade": len(documentos),
        "documentos": [
            documento.page_content
            for documento in documentos
        ]
    }


@app.post("/perguntar")
def perguntar(pergunta: Pergunta):

    if not pergunta.mensagem.strip():
        return {
            "resposta": "Digite uma pergunta para continuar."
        }

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
