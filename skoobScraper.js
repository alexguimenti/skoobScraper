// Mapeamento dos tipos de status de leitura
const tipoMap = {
    1: 'Lidos',
    2: 'Lendo atualmente',
    3: 'Quero ler',
    4: 'Relendo',
    5: 'Abandonou',
    6: 'Desejado'
};

// Função para fazer uma chamada à API e buscar todas as páginas de resultados
async function fetchAllBookcaseBooks() {
    const baseUrl = 'https://www.skoob.com.br/v1/bookcase/books/3485846?tipo=1'; // Adicionando o parâmetro tipo
    let allBooks = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
        while (currentPage <= totalPages) {
            let url = `${baseUrl}&page=${currentPage}`;
            let response = await fetch(url);

            if (response.ok) {
                let data = await response.json();

                if (data.response) {
                    allBooks = allBooks.concat(data.response);
                } else {
                    console.log(`Nenhum livro encontrado na página ${currentPage}`);
                }

                totalPages = data.paging.page_count;
                currentPage++;

                console.log(`Página atual: ${currentPage - 1} de ${totalPages}`);
                console.log(`Há próxima página? ${data.paging.next_page}`);
            } else {
                throw new Error(`Erro na resposta da API: ${response.status}`);
            }
        }

        console.log('Todos os livros coletados:', allBooks.length);
        console.log('Script terminou de rodar.');

        // Processar todos os livros em paralelo para obter o ranking
        await Promise.all(allBooks.map(async (book) => {
            const bookId = book.edicao.id;
            const ranking = await fetchBookRanking(bookId);
            Object.assign(book, book.edicao);
            delete book.edicao;
            book.avaliacao = ranking;
        }));

        // Substituir o valor do tipo pelo texto correspondente
        allBooks = allBooks.map(book => {
            book.tipo = tipoMap[book.tipo] || book.tipo;
            return book;
        });

        console.log('Livros com avaliação e tipo atualizado:', allBooks.length);

        // Gerar e baixar o CSV
        console.log('Preparando para gerar o arquivo CSV...');
        downloadCSV(allBooks);

    } catch (error) {
        console.error('Erro ao fazer a chamada à API:', error);
    }
}

// Função para fazer a chamada da API para um livro específico e extrair o ranking
async function fetchBookRanking(bookId) {
    const bookUrl = `https://www.skoob.com.br/v1/book/${bookId}/user_id:3485846/stats:true/`;
    try {
        let response = await fetch(bookUrl);
        if (response.ok) {
            let data = await response.json();
            return data.response.estatisticas.ranking;
        } else {
            throw new Error(`Erro na resposta da API: ${response.status}`);
        }
    } catch (error) {
        console.error(`Erro ao buscar os dados do livro ${bookId}:`, error);
        return null;
    }
}

// Função para converter os dados em CSV e fazer o download
function downloadCSV(data) {
    console.log('Estado: Gerando CSV...');
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => JSON.stringify(row[header], (key, value) => value === null ? '' : value));
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'livros.csv');
    document.body.appendChild(a);
    console.log('Download começando...');
    a.click();
    document.body.removeChild(a);
    console.log('Download foi pedido.');
}

// Chamar a função para executar a chamada à API
fetchAllBookcaseBooks();



