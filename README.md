# Skoob Bookshelf Scraper

Scraper para exportar a estante do [Skoob](https://www.skoob.com.br) com dados completos de cada livro.

## O que extrai

| Campo | Descrição |
|-------|-----------|
| `book_id` | ID do livro no Skoob |
| `edition_id` | ID da edição específica |
| `title` | Título do livro |
| `author` | Autor |
| `publisher` | Editora |
| `year` | Ano de publicação |
| `pages` | Número de páginas |
| `status` | Status na estante (`read`, `reading`, `want_to_read`, `abandoned`, etc.) |
| `my_rating` | Sua nota (1-5, null se não avaliou) |
| `avg_rating` | Nota média da comunidade Skoob |
| `rating_count` | Total de avaliações |
| `readers` | Total de leitores |
| `progress` | Progresso de leitura (%) |
| `finished_at` | Data de conclusão |
| `url` | Link direto para o livro |
| `cover` | URL da capa |

## Setup

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1          # PowerShell
# ou: source .venv/Scripts/activate  # Git Bash

pip install -r requirements.txt
playwright install chromium
```

## Configuração

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```
SKOOB_EMAIL=seu@email.com
SKOOB_PASSWORD=suasenha
SKOOB_USER_ID=seu_user_id       # opcional, tem default
SKOOB_FILTER=all                # opcional: all, read, reading, want_to_read, abandoned
```

## Uso

```bash
python scraper.py
```

O scraper:
1. Abre o Chromium e faz login automaticamente no Skoob
2. Busca todos os livros da estante via API interna (`prd-api.skoob.com.br`)
3. Para cada livro, busca nota média e total de avaliações (5 requests em paralelo)
4. Salva os resultados em `books.json` e `books.csv`

## Como funciona

- **Login:** Playwright automatiza o fluxo de login multi-step do Skoob (email -> senha)
- **Dados da estante:** Intercepta os headers de autenticação do browser e usa a API REST diretamente via `requests`
- **Notas e avaliações:** Extrai do JSON-LD (Schema.org) embutido nas páginas dos livros — não precisa renderizar JavaScript
- **Paralelismo:** `ThreadPoolExecutor` com 5 workers para buscar detalhes dos livros

## Personalização

Via variáveis de ambiente no `.env`:
- `SKOOB_USER_ID` — seu ID de usuário (visível na URL do perfil)
- `SKOOB_FILTER` — filtro da estante (`all`, `read`, `reading`, `want_to_read`, `abandoned`, `desired`, `favorited`, `owned`, `lent`, `ebook`, `audiobook`)
