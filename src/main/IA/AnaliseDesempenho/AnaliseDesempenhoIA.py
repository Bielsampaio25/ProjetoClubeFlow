from fastapi import FastAPI, UploadFile, File, HTTPException
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
import tempfile
import os
import re
import json
import math

load_dotenv()

app = FastAPI(

    title="Club Flow - IA de Análise de Desempenho",

    description="API para análise de documentos esportivos",

    version="1.0.0"

)

LIMITE_PDF = 10 * 1024 * 1024

MODELO_IA = "qwen3.5:0.8b"

MODELO_EMBEDDING = "qwen3-embedding:0.6b"

ATRIBUTOS = [

    "velocidade",

    "finalizacao",

    "drible",

    "passe",

    "resistencia"

]

class ConsultaDesempenho(BaseModel):

    mensagem: str

ROTULOS_RELATORIO = [
    "Data do relatório", "Período", "ID do atleta", "Pé dominante",
    "Jogos disputados", "Finalizações no alvo", "Minutos jogados",
    "Passes tentados", "Passes certos", "Dribles tentados", "Dribles certos",
    "Velocidade máxima", "Velocidade média", "Precisão de finalização",
    "Precisão de passe", "Taxa de dribles certos",
    "Distância em alta intensidade", "Distância total",
    "Teste de resistência", "Assistências", "Finalizações",
    "Categoria", "Posição", "Clube", "Nome", "Gols"
]

def _normalizar_texto_pdf(texto):
    texto = str(texto or "")
    texto = texto.replace("\u00a0", " ").replace("\u200b", "")
    texto = re.sub(r"[ \t]+", " ", texto)
    return texto.strip()

def _buscar_rotulo(texto, rotulo):
    rotulo_regex = rotulo if rotulo.startswith("r") else rotulo
    return re.search(r"(?<![\w])(?:" + rotulo_regex + r")(?![\w])", texto, re.IGNORECASE)

def extrair_valor_texto(texto, rotulo):
    texto = _normalizar_texto_pdf(texto)
    match = _buscar_rotulo(texto, rotulo)
    if not match:
        return None

    inicio = match.end()
    restante = texto[inicio:]
    restante = re.sub(r"^[\s:：–—-]+", "", restante)

    # Captura valor na mesma linha ou linha seguinte, parando no próximo rótulo.
    limite = len(restante)
    for proximo in ROTULOS_RELATORIO:
        if re.fullmatch(rotulo, proximo, re.IGNORECASE):
            continue
        achado = _buscar_rotulo(restante, re.escape(proximo))
        if achado and achado.start() < limite:
            limite = achado.start()

    valor = restante[:limite].strip(" \t\r\n:：–—-")
    if not valor:
        valor = restante.splitlines()[0].strip() if restante.splitlines() else ""
    return valor or None

def converter_numero(valor):
    if valor is None:
        return None
    valor = str(valor).strip().replace(" ", "")
    if not valor:
        return None

    # Formatos brasileiros: 1.350; 32,4; 1.350,5; e formatos internacionais 1,350.5.
    if "." in valor and "," in valor:
        if valor.rfind(",") > valor.rfind("."):
            valor = valor.replace(".", "").replace(",", ".")
        else:
            valor = valor.replace(",", "")
    elif "," in valor:
        if re.fullmatch(r"\d{1,3}(?:,\d{3})+", valor):
            valor = valor.replace(",", "")
        else:
            valor = valor.replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", valor):
        valor = valor.replace(".", "")

    try:
        numero = float(valor)
        return int(numero) if numero.is_integer() else numero
    except (ValueError, TypeError):
        return None

def extrair_numero(texto, rotulo):
    texto = _normalizar_texto_pdf(texto)
    match = _buscar_rotulo(texto, rotulo)
    if not match:
        return None
    restante = texto[match.end():]
    restante = re.sub(r"^[\s:：–—-]+", "", restante)
    resultado = re.match(r"([+-]?\d+(?:[.,]\d{1,3})*(?:[.,]\d+)?)", restante)
    if not resultado:
        return None
    return converter_numero(resultado.group(1))

def extrair_data_periodo(texto):

    padrao = (

        r"(\d{2}/\d{2}/\d{4})"

        r"\s+a\s+"

        r"(\d{2}/\d{2}/\d{4})"

    )

    resultado = re.search(padrao, texto)

    if resultado:

        return {

            "inicio": resultado.group(1),

            "fim": resultado.group(2)

        }

    return {

        "inicio": None,

        "fim": None

    }

def extrair_distancia_cooper(texto):
    texto = _normalizar_texto_pdf(texto)
    padroes = [
        r"(?:teste\s+)?cooper[^\n]{0,120}?([\d.,]+)\s*m\b",
        r"distância\s+(?:do\s+)?(?:teste\s+)?cooper[^\n]{0,80}?([\d.,]+)\s*m\b",
        r"distância\s+([\d.,]+)\s*m\b"
    ]
    for padrao in padroes:
        resultado = re.search(padrao, texto, re.IGNORECASE)
        if resultado:
            numero = converter_numero(resultado.group(1))
            if numero is not None and numero >= 1000:
                return numero
    return None

def organizar_dados_relatorio(texto):

    periodo = extrair_data_periodo(texto)

    data_relatorio = extrair_valor_texto(

        texto,

        r"Data do relatório"

    )

    dados = {

        "atleta": {

            "nome": extrair_valor_texto(

                texto,

                r"Nome"

            ),

            "id": extrair_valor_texto(

                texto,

                r"ID do atleta"

            ),

            "clube": extrair_valor_texto(

                texto,

                r"Clube"

            ),

            "categoria": extrair_valor_texto(

                texto,

                r"Categoria"

            ),

            "posicao": extrair_valor_texto(

                texto,

                r"Posição"

            ),

            "pe_dominante": extrair_valor_texto(

                texto,

                r"Pé dominante"

            )

        },

        "periodo": {

            "inicio": periodo["inicio"],

            "fim": periodo["fim"],

            "data_relatorio": data_relatorio

        },

        "estatisticas": {

            "jogos": extrair_numero(

                texto,

                r"Jogos disputados"

            ),

            "gols": extrair_numero(

                texto,

                r"Gols"

            ),

            "assistencias": extrair_numero(

                texto,

                r"Assistências"

            ),

            "finalizacoes": extrair_numero(

                texto,

                r"Finalizações"

            ),

            "minutos_jogados": extrair_numero(

                texto,

                r"Minutos jogados"

            ),

            "finalizacoes_no_alvo": extrair_numero(

                texto,

                r"Finalizações no alvo"

            ),

            "passes_certos": extrair_numero(

                texto,

                r"Passes certos"

            ),

            "passes_tentados": extrair_numero(

                texto,

                r"Passes tentados"

            ),

            "dribles_certos": extrair_numero(

                texto,

                r"Dribles certos"

            ),

            "dribles_tentados": extrair_numero(

                texto,

                r"Dribles tentados"

            )

        },

        "metricas": {

            "velocidade_maxima": extrair_numero(

                texto,

                r"Velocidade máxima"

            ),

            "velocidade_media": extrair_numero(

                texto,

                r"Velocidade média"

            ),

            "precisao_finalizacao": extrair_numero(

                texto,

                r"Precisão de finalização"

            ),

            "precisao_passe": extrair_numero(

                texto,

                r"Precisão de passe"

            ),

            "taxa_dribles_certos": extrair_numero(

                texto,

                r"Taxa de dribles certos"

            ),

            "distancia_total_media": extrair_numero(

                texto,

                r"Distância total"

            ),

            "distancia_alta_intensidade_media": extrair_numero(

                texto,

                r"Distância em alta intensidade"

            ),

            "teste_cooper_minutos": extrair_numero(

                texto,

                r"Teste de resistência"

            ),

            "teste_cooper_distancia_metros": extrair_distancia_cooper(

                texto

            )

        }

    }

    return dados

def limitar(valor, minimo, maximo):

    return max(

        minimo,

        min(valor, maximo)

    )

def normalizar_nota(valor, minimo, maximo):

    if valor is None:

        return None

    if maximo <= minimo:

        return None

    nota = (

        (valor - minimo)

        / (maximo - minimo)

    ) * 10

    return round(

        limitar(nota, 0, 10),

        2

    )

def calcular_media_ponderada(componentes):

    componentes_validos = [

        componente

        for componente in componentes

        if componente["nota"] is not None

    ]

    if not componentes_validos:

        return None

    peso_total = sum(

        componente["peso"]

        for componente in componentes_validos

    )

    if peso_total == 0:

        return None

    resultado = sum(

        componente["nota"] * componente["peso"]

        for componente in componentes_validos

    ) / peso_total

    return round(resultado, 2)

def calcular_gols_por_90(dados):

    estatisticas = dados.get(

        "estatisticas",

        {}

    )

    gols = estatisticas.get("gols")

    minutos = estatisticas.get("minutos_jogados")

    if gols is None or minutos is None:

        return None

    if minutos <= 0:

        return None

    return round(

        (gols / minutos) * 90,

        3

    )

def calcular_notas_desempenho(dados):

    metricas = dados.get(

        "metricas",

        {}

    )

    estatisticas = dados.get(

        "estatisticas",

        {}

    )

    resultados = {}

    velocidade_maxima = metricas.get(

        "velocidade_maxima"

    )

    velocidade_media = metricas.get(

        "velocidade_media"

    )

    componentes_velocidade = []

    if velocidade_maxima is not None:

        componentes_velocidade.append({

            "nota": normalizar_nota(

                velocidade_maxima,

                20,

                35

            ),

            "peso": 0.70

        })

    if velocidade_media is not None:

        componentes_velocidade.append({

            "nota": normalizar_nota(

                velocidade_media,

                18,

                28

            ),

            "peso": 0.30

        })

    resultados["velocidade"] = calcular_media_ponderada(

        componentes_velocidade

    )

    precisao_finalizacao = metricas.get(

        "precisao_finalizacao"

    )

    gols_por_90 = calcular_gols_por_90(

        dados

    )

    componentes_finalizacao = []

    if precisao_finalizacao is not None:

        componentes_finalizacao.append({

            "nota": normalizar_nota(

                precisao_finalizacao,

                20,

                80

            ),

            "peso": 0.70

        })

    if gols_por_90 is not None:

        componentes_finalizacao.append({

            "nota": normalizar_nota(

                gols_por_90,

                0.1,

                0.8

            ),

            "peso": 0.30

        })

    resultados["finalizacao"] = calcular_media_ponderada(

        componentes_finalizacao

    )

    taxa_dribles = metricas.get(

        "taxa_dribles_certos"

    )

    if taxa_dribles is None:

        dribles_certos = estatisticas.get(

            "dribles_certos"

        )

        dribles_tentados = estatisticas.get(

            "dribles_tentados"

        )

        if (

            dribles_certos is not None

            and dribles_tentados is not None

            and dribles_tentados > 0

        ):

            taxa_dribles = (

                dribles_certos

                / dribles_tentados

            ) * 100

    resultados["drible"] = normalizar_nota(

        taxa_dribles,

        40,

        90

    )

    precisao_passe = metricas.get(

        "precisao_passe"

    )

    if precisao_passe is None:

        passes_certos = estatisticas.get(

            "passes_certos"

        )

        passes_tentados = estatisticas.get(

            "passes_tentados"

        )

        if (

            passes_certos is not None

            and passes_tentados is not None

            and passes_tentados > 0

        ):

            precisao_passe = (

                passes_certos

                / passes_tentados

            ) * 100

    resultados["passe"] = normalizar_nota(

        precisao_passe,

        60,

        95

    )

    cooper = metricas.get(

        "teste_cooper_distancia_metros"

    )

    distancia_total = metricas.get(

        "distancia_total_media"

    )

    componentes_resistencia = []

    if cooper is not None:

        componentes_resistencia.append({

            "nota": normalizar_nota(

                cooper,

                1800,

                3200

            ),

            "peso": 0.70

        })

    if distancia_total is not None:

        componentes_resistencia.append({

            "nota": normalizar_nota(

                distancia_total,

                6,

                12

            ),

            "peso": 0.30

        })

    resultados["resistencia"] = calcular_media_ponderada(

        componentes_resistencia

    )

    notas_validas = [

        nota

        for nota in resultados.values()

        if nota is not None

    ]

    nota_media = None

    if notas_validas:

        nota_media = round(

            sum(notas_validas)

            / len(notas_validas),

            2

        )

    return {

        "notas": resultados,

        "nota_media": nota_media,

        "quantidade_metricas_avaliadas": len(

            notas_validas

        )

    }

def gerar_justificativa_deterministica(

    atributo,

    dados,

    nota

):

    metricas = dados.get(

        "metricas",

        {}

    )

    estatisticas = dados.get(

        "estatisticas",

        {}

    )

    if nota is None:

        return (

            "Não há indicadores suficientes no relatório "

            "para calcular uma nota confiável deste atributo."

        )

    if atributo == "velocidade":

        partes = []

        vmax = metricas.get(

            "velocidade_maxima"

        )

        vmedia = metricas.get(

            "velocidade_media"

        )

        if vmax is not None:

            partes.append(

                f"velocidade máxima registrada de {vmax} km/h"

            )

        if vmedia is not None:

            partes.append(

                f"velocidade média de {vmedia} km/h"

            )

        if not partes:

            return (

                "Não foram encontrados indicadores de velocidade "

                "suficientes para interpretar este atributo."

            )

        return (

            "A avaliação de velocidade considera "

            + " e ".join(partes)

            + ". A nota é calculada por uma escala experimental "

            "do Club Flow e não representa uma comparação "

            "oficial com outros atletas."

        )

    if atributo == "finalizacao":

        partes = []

        gols = estatisticas.get(

            "gols"

        )

        finalizacoes = estatisticas.get(

            "finalizacoes"

        )

        no_alvo = estatisticas.get(

            "finalizacoes_no_alvo"

        )

        precisao = metricas.get(

            "precisao_finalizacao"

        )

        if gols is not None:

            partes.append(

                f"{gols} gols registrados"

            )

        if (

            no_alvo is not None

            and finalizacoes is not None

        ):

            partes.append(

                f"{no_alvo} finalizações no alvo "

                f"em {finalizacoes} tentativas"

            )

        if precisao is not None:

            partes.append(

                f"precisão de {precisao}%"

            )

        if not partes:

            return (

                "Não foram encontrados indicadores "

                "suficientes de finalização."

            )

        return (

            "A avaliação de finalização considera "

            + ", ".join(partes)

            + ". Os dados não informam a qualidade das "

            "oportunidades, a distância dos chutes ou "

            "a dificuldade de cada finalização."

        )

    if atributo == "drible":

        certos = estatisticas.get(

            "dribles_certos"

        )

        tentados = estatisticas.get(

            "dribles_tentados"

        )

        taxa = metricas.get(

            "taxa_dribles_certos"

        )

        partes = []

        if certos is not None and tentados is not None:

            partes.append(

                f"{certos} dribles certos em {tentados} tentativas"

            )

        if taxa is not None:

            partes.append(

                f"eficiência de {taxa}%"

            )

        if not partes:

            return (

                "Não foram encontrados indicadores "

                "suficientes para avaliar o drible."

            )

        return (

            "A avaliação de drible considera "

            + " e ".join(partes)

            + ". Os números representam o aproveitamento "

            "das tentativas registradas, sem indicar "

            "a dificuldade ou o contexto de cada ação."

        )

    if atributo == "passe":

        certos = estatisticas.get(

            "passes_certos"

        )

        tentados = estatisticas.get(

            "passes_tentados"

        )

        precisao = metricas.get(

            "precisao_passe"

        )

        partes = []

        if certos is not None and tentados is not None:

            partes.append(

                f"{certos} passes certos de {tentados} tentados"

            )

        if precisao is not None:

            partes.append(

                f"precisão de {precisao}%"

            )

        if not partes:

            return (

                "Não foram encontrados indicadores "

                "suficientes para avaliar o passe."

            )

        return (

            "A avaliação de passe considera "

            + " e ".join(partes)

            + ". O relatório não especifica a dificuldade, "

            "distância ou impacto tático dos passes."

        )

    if atributo == "resistencia":

        cooper = metricas.get(

            "teste_cooper_distancia_metros"

        )

        distancia = metricas.get(

            "distancia_total_media"

        )

        alta_intensidade = metricas.get(

            "distancia_alta_intensidade_media"

        )

        partes = []

        if cooper is not None:

            partes.append(

                f"resultado de {cooper} metros no teste de Cooper"

            )

        if distancia is not None:

            partes.append(

                f"distância média de {distancia} km por partida"

            )

        if alta_intensidade is not None:

            partes.append(

                f"{alta_intensidade} km em alta intensidade por partida"

            )

        if not partes:

            return (

                "Não foram encontrados indicadores "

                "suficientes para avaliar a resistência."

            )

        return (

            "A avaliação de resistência considera "

            + ", ".join(partes)

            + ". A interpretação está limitada aos indicadores "

            "registrados no relatório e não constitui "

            "avaliação médica ou fisiológica."

        )

    return (

        "A avaliação foi calculada a partir dos indicadores "

        "disponíveis no relatório."

    )

def gerar_recomendacoes_fallback(dados):

    metricas = dados.get(

        "metricas",

        {}

    )

    estatisticas = dados.get(

        "estatisticas",

        {}

    )

    recomendacoes = []

    if (

        metricas.get("precisao_finalizacao") is not None

        or estatisticas.get("finalizacoes") is not None

    ):

        recomendacoes.append({

            "atributo": "finalizacao",

            "recomendacao": (

                "Praticar finalizações de diferentes ângulos, "

                "distâncias e zonas de chute, alternando "

                "entre precisão e rapidez de execução."

            ),

            "objetivo": (

                "Desenvolver controle e variedade nas finalizações."

            )

        })

    # Drible

    if (

        metricas.get("taxa_dribles_certos") is not None

        or estatisticas.get("dribles_tentados") is not None

    ):

        recomendacoes.append({

            "atributo": "drible",

            "recomendacao": (

                "Realizar exercícios de condução de bola, "

                "mudanças de direção e situações de 1 contra 1, "

                "variando velocidade e espaço."

            ),

            "objetivo": (

                "Trabalhar controle de bola e eficiência "

                "nas tentativas de drible."

            )

        })

    # Passe

    if (

        metricas.get("precisao_passe") is not None

        or estatisticas.get("passes_tentados") is not None

    ):

        recomendacoes.append({

            "atributo": "passe",

            "recomendacao": (

                "Treinar passes curtos, médios e longos, "

                "com exercícios de tomada de decisão "

                "e movimentação dos companheiros."

            ),

            "objetivo": (

                "Trabalhar a precisão e a execução dos passes "

                "em diferentes situações."

            )

        })

    # Velocidade

    if (

        metricas.get("velocidade_maxima") is not None

        or metricas.get("velocidade_media") is not None

    ):

        recomendacoes.append({

            "atributo": "velocidade",

            "recomendacao": (

                "Realizar exercícios de aceleração, "

                "deslocamentos curtos e corridas com "

                "recuperação adequada, sob orientação do treinador."

            ),

            "objetivo": (

                "Desenvolver capacidades de aceleração "

                "e velocidade."

            )

        })

    # Resistência

    if (

        metricas.get("teste_cooper_distancia_metros") is not None

        or metricas.get("distancia_total_media") is not None

    ):

        recomendacoes.append({

            "atributo": "resistencia",

            "recomendacao": (

                "Realizar atividades de condicionamento "

                "aeróbico e exercícios intervalados planejados "

                "pelo profissional responsável."

            ),

            "objetivo": (

                "Desenvolver condicionamento e capacidade "

                "de sustentar esforços durante as partidas."

            )

        })

    return recomendacoes[:5]

PROMPT_ANALISE_ATLETA = """

Você é um assistente de análise esportiva do Club Flow.

Seu trabalho é interpretar indicadores de desempenho de futebol

e sugerir exercícios gerais de desenvolvimento.

Você NÃO é responsável por calcular as notas.

As notas já foram calculadas pelo sistema Python.

Nunca altere, recalcule ou invente uma nota.

REGRAS CRÍTICAS DE CONFIABILIDADE:

1. Utilize somente os dados apresentados no JSON de entrada.

2. Não invente estatísticas, resultados, números ou situações de jogo.

3. Não invente benchmarks, médias de atletas, padrões de categorias,

   exigências de clubes ou critérios oficiais.

4. Não afirme que o atleta é melhor ou pior que outros atletas.

5. Não declare que o atleta está acima ou abaixo da média

   sem uma base comparativa fornecida.

6. Não use a categoria, idade ou posição para inventar

   requisitos técnicos.

7. Não confunda os atributos.

8. Cada atributo deve ser interpretado separadamente.

9. Não relacione velocidade com drible, passe com finalização,

   resistência com técnica ou outros atributos sem evidência.

10. Não atribua causa a um resultado.

11. Não invente situações de pressão, adversários,

    condições táticas ou dificuldades de jogo.

12. Não transforme uma nota em diagnóstico definitivo.

13. Não use expressões como "deficiente", "muito abaixo",

    "excelente", "insuficiente" ou "acima da média"

    sem critério explícito fornecido.

14. Não interprete valores ausentes como zero.

15. Se um indicador não estiver disponível, não o utilize.

16. Não afirme evolução, regressão ou estabilidade

    sem dados de períodos comparáveis.

17. Não invente informações sobre lesões, saúde ou condição médica.

18. Não faça diagnóstico médico.

19. Não garanta que um exercício produzirá determinado resultado.

20. Recomendações devem ser gerais, seguras e relacionadas

    aos indicadores presentes.

21. Não prescreva cargas, intensidades, frequências

    ou volumes de treinamento individualizados.

22. As recomendações devem ser adaptadas por um treinador

    responsável às condições do atleta.

23. Não invente informações para completar o JSON.

24. Se os dados forem insuficientes, seja explícito

    e não faça afirmações especulativas.

INTERPRETAÇÃO DOS ATRIBUTOS:

VELOCIDADE:

Utilize exclusivamente velocidade máxima e velocidade média.

Não interprete aceleração, explosão ou velocidade em jogo

se esses dados não foram fornecidos.

FINALIZAÇÃO:

Utilize gols, finalizações, finalizações no alvo,

precisão e gols por 90 minutos, se disponíveis.

Não invente distância, dificuldade, qualidade das oportunidades

ou circunstâncias dos chutes.

DRIBLE:

Utilize tentativas, dribles certos e eficiência.

Não invente adversários vencidos, situações de jogo

ou dificuldade dos dribles.

PASSE:

Utilize passes tentados, passes certos e precisão.

Não invente passes sob pressão, distância ou impacto tático.

RESISTÊNCIA:

Utilize teste de Cooper, distância total por partida

e distância de alta intensidade, se disponíveis.

Não faça diagnósticos fisiológicos.

Não invente recuperação, fadiga ou condicionamento médico.

RECOMENDAÇÕES:

- Sugira exercícios gerais e práticos.

- Relacione cada recomendação a um atributo.

- Explique o objetivo do exercício.

- Evite recomendações repetitivas.

- Não afirme que o atleta precisa melhorar um atributo

  apenas porque a nota parece baixa.

- Recomendações podem ser sugestões gerais de desenvolvimento.

- Não prescreva um plano médico ou de reabilitação.

- Não sugira aumento de carga sem avaliação profissional.

FORMATO OBRIGATÓRIO:

Retorne exclusivamente JSON válido.

{

    "justificativas": {

        "velocidade": "",

        "finalizacao": "",

        "drible": "",

        "passe": "",

        "resistencia": ""

    },

    "recomendacoes": [

        {

            "atributo": "",

            "recomendacao": "",

            "objetivo": ""

        }

    ]

}

REGRAS DE JSON:

- Não escreva texto antes ou depois do JSON.

- Não use Markdown.

- Não inclua notas numéricas.

- Não altere as notas fornecidas.

- Use strings em português brasileiro.

- Não inclua recomendações sem relação com os dados.

- Gere no máximo cinco recomendações.

- Não repita recomendações.

- Se não conseguir gerar uma recomendação confiável,

  retorne um array vazio.

DADOS PARA ANALISAR:

{dados}

NOTAS CALCULADAS PELO SISTEMA:

{notas}

JUSTIFICATIVAS DE REFERÊNCIA GERADAS PELO SISTEMA:

{justificativas_referencia}

"""

def extrair_json_resposta(resposta):

    if isinstance(resposta, dict):

        return resposta

    if not isinstance(resposta, str):

        raise ValueError(

            "A resposta da IA não é texto nem JSON."

        )

    resposta = resposta.strip()

    try:

        return json.loads(resposta)

    except json.JSONDecodeError:

        pass

    resultado = re.search(

        r"**\\{**.***\\}**",

        resposta,

        re.DOTALL

    )

    if not resultado:

        raise ValueError(

            "A IA não retornou JSON válido."

        )

    return json.loads(

        resultado.group(0)

    )

def validar_texto_ia(texto, limite=700):

    if not isinstance(texto, str):

        return None

    texto = texto.strip()

    if not texto:

        return None

    if len(texto) > limite:

        texto = texto[:limite].strip()

    return texto

def validar_recomendacoes_ia(recomendacoes):

    if not isinstance(recomendacoes, list):

        return []

    recomendacoes_validas = []

    atributos_permitidos = set(

        ATRIBUTOS

    )

    for item in recomendacoes:

        if not isinstance(item, dict):

            continue

        atributo = item.get(

            "atributo"

        )

        recomendacao = validar_texto_ia(

            item.get("recomendacao"),

            500

        )

        objetivo = validar_texto_ia(

            item.get("objetivo"),

            300

        )

        if atributo not in atributos_permitidos:

            continue

        if not recomendacao or not objetivo:

            continue

        recomendacoes_validas.append({

            "atributo": atributo,

            "recomendacao": recomendacao,

            "objetivo": objetivo

        })

    recomendacoes_unicas = []

    textos_vistos = set()

    for item in recomendacoes_validas:

        chave = (

            item["atributo"],

            item["recomendacao"].lower()

        )

        if chave in textos_vistos:

            continue

        textos_vistos.add(chave)

        recomendacoes_unicas.append(

            item

        )

    return recomendacoes_unicas[:5]

def avaliar_metricas_com_ia(dados):

    calculo = calcular_notas_desempenho(

        dados

    )

    notas = calculo["notas"]

    justificativas_referencia = {}

    for atributo in ATRIBUTOS:

        justificativas_referencia[atributo] = (

            gerar_justificativa_deterministica(

                atributo,

                dados,

                notas.get(atributo)

            )

        )

    recomendacoes_fallback = (

        gerar_recomendacoes_fallback(

            dados

        )

    )

    justificativas_finais = (

        justificativas_referencia.copy()

    )

    recomendacoes_finais = (

        recomendacoes_fallback.copy()

    )

    try:

        prompt = ChatPromptTemplate.from_template(

            PROMPT_ANALISE_ATLETA

        )

        modelo = ChatOllama(

            model=MODELO_IA,

            reasoning=False,

            format="json",

            temperature=0.1

        )

        chain_analise = (

            prompt

            | modelo

            | StrOutputParser()

        )

        resposta = chain_analise.invoke({

            "dados": json.dumps(

                dados,

                ensure_ascii=False,

                indent=2

            ),

            "notas": json.dumps(

                notas,

                ensure_ascii=False,

                indent=2

            ),

            "justificativas_referencia": json.dumps(

                justificativas_referencia,

                ensure_ascii=False,

                indent=2

            )

        })

        resultado_ia = extrair_json_resposta(

            resposta

        )

        justificativas_ia = resultado_ia.get(

            "justificativas",

            {}

        )

        if isinstance(justificativas_ia, dict):

            for atributo in ATRIBUTOS:

                justificativa = validar_texto_ia(

                    justificativas_ia.get(atributo),

                    700

                )

                if justificativa:

                    justificativas_finais[atributo] = (

                        justificativa

                    )

        recomendacoes_ia = validar_recomendacoes_ia(

            resultado_ia.get(

                "recomendacoes",

                []

            )

        )

        if recomendacoes_ia:

            recomendacoes_finais = (

                recomendacoes_ia

            )

    except Exception as erro:

        print(

            "Erro na interpretação complementar da IA:",

            erro

        )

    resultado_final = {}

    for atributo in ATRIBUTOS:

        resultado_final[atributo] = {

            "nota": notas.get(atributo),

            "justificativa": (

                justificativas_finais.get(atributo)

            )

        }

    resultado_final["nota_media"] = (

        calculo["nota_media"]

    )

    resultado_final[

        "quantidade_metricas_avaliadas"

    ] = calculo[

        "quantidade_metricas_avaliadas"

    ]

    resultado_final[

        "recomendacoes"

    ] = recomendacoes_finais

    return resultado_final

def carregar_pdf():

    caminho_pdf = (

        Path(__file__).parent

        / "Manual_IA_Analise_Desempenho_Clube_Flow.pdf"

    )

    print(

        "Pasta da API:",

        Path(__file__).parent

    )

    print(

        "Caminho do manual:",

        caminho_pdf

    )

    print(

        "PDF encontrado:",

        caminho_pdf.exists()

    )

    if not caminho_pdf.exists():

        raise FileNotFoundError(

            f"Manual de análise de desempenho não encontrado: "

            f"{caminho_pdf}"

        )

    pdf_loader = PyPDFLoader(

        str(caminho_pdf)

    )

    documentos = pdf_loader.load()

    print(

        f"Total de páginas carregadas: {len(documentos)}"

    )

    return documentos

def criar_banco_vetores():

    documentos = carregar_pdf()

    separador = RecursiveCharacterTextSplitter(

        chunk_size=1000,

        chunk_overlap=200

    )

    blocos = separador.split_documents(

        documentos

    )

    print(

        f"Total de blocos criados: {len(blocos)}"

    )

    embeddings = OllamaEmbeddings(

        model=MODELO_EMBEDDING

    )

    banco = FAISS.from_documents(

        blocos,

        embeddings

    )

    print(

        "Banco vetorial da análise de desempenho "

        "criado com sucesso."

    )

    return banco

def criar_chain_analise(banco_vetores):

    prompt_template = ChatPromptTemplate.from_template("""

Você é a inteligência artificial de análise de desempenho

esportivo da plataforma Club Flow.

Sua função é auxiliar atletas e usuários a compreender

estatísticas esportivas, avaliações e indicadores.

REGRAS DE CONFIABILIDADE:

1. Responda em português brasileiro.

2. Utilize linguagem clara, natural e profissional.

3. Responda diretamente à pergunta.

4. Utilize somente informações do contexto disponível.

5. Não invente dados, métricas, resultados ou informações.

6. Não invente notas ou critérios de avaliação.

7. Não invente benchmarks ou médias de atletas.

8. Não invente exigências de categoria, idade ou posição.

9. Não interprete dados ausentes como zero.

10. Não afirme evolução sem dados comparáveis.

11. Não confunda os atributos esportivos.

12. Não apresente hipóteses como fatos.

13. Não invente situações de jogo.

14. Não faça diagnósticos médicos.

15. Não garanta resultados futuros.

16. Não invente funcionalidades da plataforma.

17. Se o contexto não responder à pergunta, informe claramente.

18. Não utilize conhecimento externo como se fosse dado

    do atleta ou documentação do Club Flow.

19. Se precisar calcular algo, utilize apenas valores

    explícitos e cálculos matemáticos simples.

20. Ao calcular, informe quais dados foram utilizados.

REGRAS DE INTERPRETAÇÃO:

- Preserve os valores, unidades e significados.

- Considere a metodologia dos indicadores.

- Não interprete automaticamente valores maiores como melhores.

- Não declare que um atleta é excelente, ruim, insuficiente

  ou acima da média sem critérios definidos.

- Diferencie os dados apresentados de suas interpretações.

- Explique limitações quando houver dados insuficientes.

REGRAS DE COMPARAÇÃO:

- Compare somente indicadores equivalentes.

- Verifique unidades, períodos e metodologias.

- Organize avaliações cronologicamente quando houver datas.

- Não trate dados ausentes como zero.

- Não conclua melhora ou piora sem comparação válida.

- Se os dados não forem comparáveis, explique por quê.

RECOMENDAÇÕES:

- Relacione recomendações aos dados disponíveis.

- Não invente necessidades do atleta.

- Não prescreva carga, volume ou frequência individualizados.

- Não faça recomendações médicas.

- Sugestões gerais de exercícios devem ser adaptadas

  por um treinador responsável.

FORMATAÇÃO:

- Utilize títulos somente quando necessário.

- Use listas para organizar recomendações.

- Use tabelas para comparar vários indicadores.

- Destaque valores importantes.

- Apresente unidades junto aos números.

- Evite repetir informações.

- Mantenha respostas simples e objetivas.

JSON:

Quando solicitado a fornecer dados para uma API:

- Retorne exclusivamente JSON válido.

- Não inclua texto fora do JSON.

- Utilize null para dados ausentes.

- Não invente valores.

- Não coloque comentários no JSON.

- Utilize nomes de propriedades claros.

- Garanta que a estrutura esteja válida.

CONTEXTO RECUPERADO:

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

        model=MODELO_IA,

        reasoning=False,

        temperature=0.1

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

chain = criar_chain_analise(

    banco_vetores

)

@app.get("/")

def inicio():

    return {

        "mensagem": (

            "API de análise de desempenho "

            "do Club Flow funcionando!"

        ),

        "upload_pdf": "/analisar-documento",

        "documentacao": "/docs"

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

        "Como funciona a análise de desempenho dos atletas?"

    )

    return {

        "quantidade": len(documentos),

        "documentos": [

            documento.page_content

            for documento in documentos

        ]

    }

@app.post("/analisar-documento")

async def analisar_documento(

    arquivo: UploadFile = File(...)

):

    nome_arquivo = (

        arquivo.filename

        or "documento.pdf"

    )

    if not nome_arquivo.lower().endswith(".pdf"):

        raise HTTPException(

            status_code=400,

            detail="Envie um arquivo PDF."

        )

    conteudo = await arquivo.read()

    if not conteudo:

        raise HTTPException(

            status_code=400,

            detail="O arquivo enviado está vazio."

        )

    if len(conteudo) > LIMITE_PDF:

        raise HTTPException(

            status_code=413,

            detail="O PDF ultrapassa o limite de 10 MB."

        )

    if not conteudo.startswith(b"%PDF"):

        raise HTTPException(

            status_code=400,

            detail="O arquivo enviado não é um PDF válido."

        )

    caminho_temporario = None

    try:

        with tempfile.NamedTemporaryFile(

            suffix=".pdf",

            delete=False

        ) as arquivo_temporario:

            arquivo_temporario.write(

                conteudo

            )

            caminho_temporario = (

                arquivo_temporario.name

            )

        pdf_loader = PyPDFLoader(

            caminho_temporario

        )

        paginas = pdf_loader.load()

        texto_extraido = "\n\n".join(

            pagina.page_content

            for pagina in paginas

        ).strip()

        if not texto_extraido:

            return {

                "sucesso": False,

                "arquivo": nome_arquivo,

                "paginas": len(paginas),

                "caracteres_extraidos": 0,

                "texto_extraido": "",

                "dados": None,

                "mensagem": (

                    "Não foi possível extrair texto deste PDF. "

                    "O documento pode estar digitalizado como imagem "

                    "e precisar de OCR."

                ),

                "necessita_ocr": True

            }

        dados_extraidos = organizar_dados_relatorio(

            texto_extraido

        )

        avaliacao_ia = avaliar_metricas_com_ia(

            dados_extraidos

        )

        dados_extraidos["avaliacao_ia"] = (

            avaliacao_ia

        )

        return {

            "sucesso": True,

            "arquivo": nome_arquivo,

            "paginas": len(paginas),

            "caracteres_extraidos": len(texto_extraido),

            "dados": dados_extraidos,

            "texto_extraido": texto_extraido,

            "necessita_ocr": False,

            "mensagem": (

                "PDF processado, métricas extraídas "

                "e avaliação de desempenho realizada "

                "com sucesso."

            )

        }

    except HTTPException:

        raise

    except Exception as erro:

        print(

            "Erro ao processar PDF:",

            erro

        )

        raise HTTPException(

            status_code=500,

            detail=(

                "Não foi possível processar o PDF "

                "ou realizar a avaliação do atleta."

            )

        )

    finally:

        await arquivo.close()

        if (

            caminho_temporario

            and os.path.exists(caminho_temporario)

        ):

            os.remove(caminho_temporario)

@app.post("/consultar")

def consultar_desempenho(consulta: ConsultaDesempenho):

    if not consulta.mensagem.strip():

        return {

            "resposta": (

                "Digite uma mensagem para continuar."

            )

        }

    try:

        resposta = chain.invoke(

            consulta.mensagem

        )

        return {

            "resposta": resposta

        }

    except Exception as erro:

        print(

            "Erro ao consultar IA de desempenho:",

            erro

        )

        return {

            "resposta": (

                "Não foi possível realizar a consulta "

                "neste momento."

            )

        }

@app.post("/perguntar")

def perguntar(consulta: ConsultaDesempenho):

    return consultar_desempenho(consulta)