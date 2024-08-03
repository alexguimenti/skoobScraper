// Função para capturar o ID do usuário da URL da página
function getUserIdFromUrl() {
    const url = window.location.href;
    const match = url.match(/usuario\/(\d+)/);
    return match ? match[1] : null;
}

const userId = getUserIdFromUrl();

if (!userId) {
    console.error('ID do usuário não encontrado na URL.');
} else {
    // URL base da API para obter a lista de livros
    const baseUrl = `https://www.skoob.com.br/v1/bookcase/books/${userId}/shelf_id:0`;
    const limit = 20; // Definindo o limite de livros por página

    const tipoMap = {
        1: 'Lidos',
        2: 'Lendo atualmente',
        3: 'Quero ler',
        4: 'Relendo',
        5: 'Abandonou',
        6: 'Desejado'
    };

    // Função para decodificar texto
    function decodeText(text) {
        try {
            return decodeURIComponent(escape(text));
        } catch (e) {
            return text;
        }
    }

    // Função para normalizar caracteres especiais
    function normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // Função para fazer a requisição de todos os livros
    async function fetchAllBooks() {
        let page = 1;
        let allBooks = [];
        let totalPageCount = 0;

        try {
            while (true) {
                const url = `${baseUrl}/page:${page}/limit:${limit}/`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.response.length === 0) {
                    console.log('Nenhum livro encontrado nesta página, terminando o loop.');
                    break;
                }

                // Transformar cada livro removendo os parâmetros de 'edicao' e 'estatisticas' colocando-os no mesmo nível
                const transformedBooks = data.response.map(book => {
                    const { edicao, estatisticas, ...rest } = book;
                    const edicaoParams = {};
                    for (const key in edicao) {
                        if (key === 'tempo_leitura') {
                            const tempoLeitura = edicao[key];
                            let totalHoras = 0;

                            if (tempoLeitura.dias) {
                                totalHoras += tempoLeitura.dias * 24;
                            }
                            if (tempoLeitura.horas) {
                                totalHoras += tempoLeitura.horas;
                            }
                            if (tempoLeitura.minutos) {
                                totalHoras += tempoLeitura.minutos / 60;
                            }

                            edicaoParams[`edicao.tempo_leitura_horas`] = totalHoras.toFixed(2);
                        } else {
                            edicaoParams[`edicao.${key}`] = decodeText(edicao[key]);
                        }
                    }
                    const estatisticasParams = {};
                    for (const key in estatisticas) {
                        estatisticasParams[`estatisticas.${key}`] = estatisticas[key];
                    }
                    return { ...rest, ...edicaoParams, ...estatisticasParams, edicaoId: edicao.id };
                });

                allBooks = allBooks.concat(transformedBooks);

                if (totalPageCount === 0) {
                    totalPageCount = data.paging.page_count;
                    console.log(`Total de páginas a serem buscadas: ${totalPageCount}`);
                }

                // Logar o progresso
                console.log(`Página ${page} de ${totalPageCount}`);

                page++;

                if (!data.paging.next_page) {
                    break;
                }
            }

            // Criar um objeto contendo todos os livros indexados por edicaoId
            const allBooksObject = {};
            allBooks.forEach(book => {
                allBooksObject[book.edicaoId] = book;
            });

            // Logar a quantidade de livros únicos encontrados
            console.log(`Total de livros únicos encontrados: ${allBooks.length}`);

            // Fazer consultas adicionais para cada livro de forma paralela
            const bookDetails = await fetchBookDetails(allBooksObject);

            // Combinar detalhes adicionais ao objeto allBooksObject
            for (const edicaoId in bookDetails) {
                allBooksObject[edicaoId] = {
                    ...allBooksObject[edicaoId],
                    ...bookDetails[edicaoId]
                };
            }

            // Logar que a parte de consulta da API terminou
            console.log('Consulta da API concluída. Preparando para gerar o CSV...');

            // Gerar e fazer download do CSV
            console.log('Iniciando a geração do CSV...');
            generateAndDownloadCSV(allBooksObject);

        } catch (error) {
            console.error('Error fetching books:', error);
        }
    }

    // Função para fazer a requisição de detalhes adicionais de cada livro
    async function fetchBookDetails(allBooksObject) {
        const bookDetailsObject = {};
        const limit = 5; // Limite de requisições simultâneas
        const books = Object.values(allBooksObject);

        // Função auxiliar para buscar detalhes de um livro
        async function fetchDetails(book, index) {
            const edicaoId = book.edicaoId;
            const detailsUrl = `https://www.skoob.com.br/v1/book/${edicaoId}/user_id:${userId}/stats:true/`;

            try {
                const response = await fetch(detailsUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Remover 'estatisticas' e colocar no mesmo nível
                const { estatisticas, ...restDetails } = data.response;
                const estatisticasParams = {};
                for (const key in estatisticas) {
                    estatisticasParams[`estatisticas.${key}`] = estatisticas[key];
                }

                bookDetailsObject[edicaoId] = { ...restDetails, ...estatisticasParams };

                // Logar o progresso
                const progress = ((index + 1) / books.length * 100).toFixed(2);
                console.log(`Progresso: ${progress}% - Livro ${index + 1} de ${books.length}`);
            } catch (error) {
                console.error(`Error fetching details for book ${edicaoId}:`, error);
            }
        }

        // Função para processar os livros em lotes
        async function processInBatches() {
            for (let i = 0; i < books.length; i += limit) {
                const batch = books.slice(i, i + limit);
                await Promise.all(batch.map((book, index) => fetchDetails(book, i + index)));
            }
        }

        await processInBatches();

        return bookDetailsObject;
    }

    // Função para gerar e fazer download do CSV
    function generateAndDownloadCSV(allBooksObject) {
        const headers = [
            'edicao.titulo', 'ano', 'autor', 'edicao.paginas', 'edicao.tempo_leitura_horas', 'estatisticas.pr_recomendam',
            'leitores', 'tipo', 'estatisticas.ranking', 'estatisticas.qt_abandonei', 'estatisticas.qt_avaliadores',
            'estatisticas.qt_desejados', 'estatisticas.qt_emprestados', 'estatisticas.qt_estantes',
            'estatisticas.qt_favoritos', 'estatisticas.qt_homens', 'estatisticas.qt_lendo',
            'estatisticas.qt_lido', 'estatisticas.qt_meta', 'estatisticas.qt_mulheres',
            'estatisticas.qt_relendo', 'estatisticas.qt_resenhas', 'estatisticas.qt_tenho',
            'estatisticas.qt_troco', 'estatisticas.qt_vouler'
        ];

        const rows = Object.values(allBooksObject).map(book => ({
            'edicao.titulo': normalizeText(decodeText(String(book['edicao.titulo'] || '').replace(/,/g, ''))),
            'ano': normalizeText(decodeText(String(book.ano || '').replace(/,/g, ''))),
            'autor': normalizeText(decodeText(String(book.autor || '').replace(/,/g, ''))),
            'edicao.paginas': book['edicao.paginas'] || '',
            'edicao.tempo_leitura_horas': String(book['edicao.tempo_leitura_horas'] || '').replace(/,/g, ''),
            'estatisticas.pr_recomendam': book['estatisticas.pr_recomendam'] || '',
            'leitores': normalizeText(decodeText(String(book.leitores || '').replace(/,/g, ''))),
            'tipo': tipoMap[book.tipo] || '',
            'estatisticas.ranking': (parseFloat(book['estatisticas.ranking']) * 10).toFixed(2) || '', // Transformar ranking para 0-100
            'estatisticas.qt_abandonei': book['estatisticas.qt_abandonei'] || '',
            'estatisticas.qt_avaliadores': book['estatisticas.qt_avaliadores'] || '',
            'estatisticas.qt_desejados': book['estatisticas.qt_desejados'] || '',
            'estatisticas.qt_emprestados': book['estatisticas.qt_emprestados'] || '',
            'estatisticas.qt_estantes': book['estatisticas.qt_estantes'] || '',
            'estatisticas.qt_favoritos': book['estatisticas.qt_favoritos'] || '',
            'estatisticas.qt_homens': book['estatisticas.qt_homens'] || '',
            'estatisticas.qt_lendo': book['estatisticas.qt_lendo'] || '',
            'estatisticas.qt_lido': book['estatisticas.qt_lido'] || '',
            'estatisticas.qt_meta': book['estatisticas.qt_meta'] || '',
            'estatisticas.qt_mulheres': book['estatisticas.qt_mulheres'] || '',
            'estatisticas.qt_relendo': book['estatisticas.qt_relendo'] || '',
            'estatisticas.qt_resenhas': book['estatisticas.qt_resenhas'] || '',
            'estatisticas.qt_tenho': book['estatisticas.qt_tenho'] || '',
            'estatisticas.qt_troco': book['estatisticas.qt_troco'] || '',
            'estatisticas.qt_vouler': book['estatisticas.qt_vouler'] || ''
        }));

        const csvContent = [
            headers.join(','), // Adiciona o cabeçalho
            ...rows.map(row => headers.map(header => row[header] ?? '').join(',')) // Adiciona as linhas de dados
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'books.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);

        console.log('Download em progresso...');
        link.click();
        document.body.removeChild(link);
        console.log('Download iniciado.');
    }

    // Chamar a função para buscar todos os livros
    fetchAllBooks();
}
