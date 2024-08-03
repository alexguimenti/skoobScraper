Skoob Bookshelf Exporter
<h1 align="center">
<br>
  <img src="https://skoob.s3.amazonaws.com/ui/v2/img/skoob-logo.png" alt="Skoob" width="120">
<br>
<br>
Skoob Bookshelf Exporter
</h1>
<p align="center">Este script permite ao usuário exportar todas as informações da estante do Skoob para um arquivo CSV</p>
<hr />
Funcionalidades
Tecnologias Aplicadas

🧾 JavaScript;
💻 Fetch API;
Começando
Faça login no site do Skoob no Desktop (não funciona em dispositivos móveis);
Acesse a página do usuário cujo ID está na URL, por exemplo, https://www.skoob.com.br/usuario/1234567;
Abra o DevTools do navegador (ctrl + shift + i para o Google Chrome);
Acesse a aba 'Console';
Copie o script a seguir e pressione 'Enter':
javascript
Copiar código
function getUserIdFromUrl(){const e=window.location.href.match(/usuario\/(\d+)/);return e?e[1]:null}const userId=getUserIdFromUrl();if(userId){const baseUrl=`https://www.skoob.com.br/v1/bookcase/books/${userId}/shelf_id:0`,limit=20,tipoMap={1:"Lidos",2:"Lendo atualmente",3:"Quero ler",4:"Relendo",5:"Abandonou",6:"Desejado"};function decodeText(e){try{return decodeURIComponent(escape(e))}catch(t){return e}}function normalizeText(e){return e.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}async function fetchAllBooks(){let e=1,t=[],o=0;try{for(;;){const n=`${baseUrl}/page:${e}/limit:${limit}/`,a=await fetch(n);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);const s=await a.json();if(0===s.response.length){console.log("Nenhum livro encontrado nesta página, terminando o loop.");break}const r=s.response.map(e=>{const{edicao:t,estatisticas:o,...n}=e,a={};for(const e in t)if("tempo_leitura"===e){const o=t[e];let n=0;o.dias&&(n+=24*o.dias),o.horas&&(n+=o.horas),o.minutos&&(n+=o.minutos/60),a["edicao.tempo_leitura_horas"]=n.toFixed(2)}else a[`edicao.${e}`]=decodeText(t[e]);const s={};for(const e in o)s[`estatisticas.${e}`]=o[e];return{...n,...a,...s,edicaoId:t.id}});if(t=t.concat(r),0===o&&(o=s.paging.page_count,console.log(`Total de páginas a serem buscadas: ${o}`)),console.log(`Página ${e} de ${o}`),e++,!s.paging.next_page)break}const n={};t.forEach(e=>{n[e.edicaoId]=e}),console.log(`Total de livros únicos encontrados: ${t.length}`);const a=await fetchBookDetails(n);for(const e in a)n[e]={...n[e],...a[e]};console.log("Consulta da API concluída. Preparando para gerar o CSV..."),console.log("Iniciando a geração do CSV..."),generateAndDownloadCSV(n)}catch(e){console.error("Error fetching books:",e)}}async function fetchBookDetails(e){const t={},o=Object.values(e);async function n(e,n){const a=e.edicaoId,s=`https://www.skoob.com.br/v1/book/${a}/user_id:${userId}/stats:true/`;try{const r=await fetch(s);if(!r.ok)throw new Error(`HTTP error! status: ${r.status}`);const i=await r.json(),{estatisticas:c,...l}=i.response,u={};for(const e in c)u[`estatisticas.${e}`]=c[e];t[a]={...l,...u};const f=((n+1)/o.length*100).toFixed(2);console.log(`Progresso: ${f}% - Livro ${n+1} de ${o.length}`)}catch(e){console.error(`Error fetching details for book ${a}:`,e)}}return async function(){for(let e=0;e<o.length;e+=5){const t=o.slice(e,e+5);await Promise.all(t.map((e,t)=>n(e,e+t)))}}(),t}function generateAndDownloadCSV(e){const t=["edicao.titulo","ano","autor","edicao.paginas","edicao.tempo_leitura_horas","estatisticas.pr_recomendam","leitores","tipo","estatisticas.ranking","estatisticas.qt_abandonei","estatisticas.qt_avaliadores","estatisticas.qt_desejados","estatisticas.qt_emprestados","estatisticas.qt_estantes","estatisticas.qt_favoritos","estatisticas.qt_homens","estatisticas.qt_lendo","estatisticas.qt_lido","estatisticas.qt_meta","estatisticas.qt_mulheres","estatisticas.qt_relendo","estatisticas.qt_resenhas","estatisticas.qt_tenho","estatisticas.qt_troco","estatisticas.qt_vouler"],o=Object.values(e).map(e=>({"edicao.titulo":normalizeText(decodeText(String(e["edicao.titulo"]||"").replace(/,/g,""))),"ano":normalizeText(decodeText(String(e.ano||"").replace(/,/g,""))),"autor":normalizeText(decodeText(String(e.autor||"").replace(/,/g,""))),"edicao.paginas":e["edicao.paginas"]||"","edicao.tempo_leitura_horas":String(e["edicao.tempo_leitura_horas"]||"").replace(/,/g,""),"estatisticas.pr_recomendam":e["estatisticas.pr_recomendam"]||"","leitores":normalizeText(decodeText(String(e.leitores||"").replace(/,/g,""))),"tipo":tipoMap[e.tipo]||"","estatisticas.ranking":(parseFloat(e["estatisticas.ranking"])*10).toFixed(2)||"","estatisticas.qt_abandonei":e["estatisticas.qt_abandonei"]||"","estatisticas.qt_avaliadores":e["estatisticas.qt_avaliadores"]||"","estatisticas.qt_desejados":e["estatisticas.qt_desejados"]||"","estatisticas.qt_emprestados":e["estatisticas.qt_emprestados"]||"","estatisticas.qt_estantes":e["estatisticas.qt_estantes"]||"","estatisticas.qt_favoritos":e["estatisticas.qt_favoritos"]||"","estatisticas.qt_homens":e["estatisticas.qt_homens"]||"","estatisticas.qt_lendo":e["estatisticas.qt_lendo"]||"","estatisticas.qt_lido":e["estatisticas.qt_lido"]||"","estatisticas.qt_meta":e["estatisticas.qt_meta"]||"","estatisticas.qt_mulheres":e["estatisticas.qt_mulheres"]||"","estatisticas.qt_relendo":e["estatisticas.qt_relendo"]||"","estatisticas.qt_resenhas":e["estatisticas.qt_resenhas"]||"","estatisticas.qt_tenho":e["estatisticas.qt_tenho"]||"","estatisticas.qt_troco":e["estatisticas.qt_troco"]||"","estatisticas.qt_vouler":e["estatisticas.qt_vouler"]||""})),n=[t.join(","),...o.map(e=>t.map(t=>e[t]??"").join(","))].join("\n"),a=new Blob([n],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(a),r=document.createElement("a");r.setAttribute("href",s),r.setAttribute("download","books.csv"),r.style.visibility="hidden",document.body.appendChild(r),console.log("Download em progresso..."),r.click(),document.body.removeChild(r),console.log("Download iniciado.")}fetchAllBooks()}else console.error("ID do usuário não encontrado na URL.");
<hr />
https://user-images.githubusercontent.com/25828420/177010111-b852bff8-80ae-4baf-9e78-0cb5f4553f14.mp4

Importante
Pode ser necessário dar permissão para habilitar o download.

<hr />
Dividir texto em diferentes colunas
Abra a planilha do Excel onde você deseja salvar os dados e clique na aba Dados.

Selecione a célula ou coluna que contém o texto que você deseja dividir.
Selecione Dados > Texto para Colunas.
No Assistente de Conversão de Texto para Colunas, selecione Delimitado > Avançar.
Selecione os Delimitadores para seus dados. Neste caso, 'vírgula'.
Selecione Avançar.
Selecione o Destino em sua planilha, que é onde você
