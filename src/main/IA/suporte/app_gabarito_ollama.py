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

    print("Pasta atual:", Path(__file__).parent)
    print("Caminho do PDF:", caminho_pdf)
    print("PDF encontrado:", caminho_pdf.exists())

    if not caminho_pdf.exists():
        raise FileNotFoundError(
            f"Manual não encontrado: {caminho_pdf}"
        )

    pdf_loader = PyPDFLoader(str(caminho_pdf))
    documentos = pdf_loader.load()

    print(f"Manual carregado: {len(documentos)} páginas")

    return documentos

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
       """ Você é o assistente virtual oficial do Club Flow.

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
