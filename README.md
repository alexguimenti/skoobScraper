
# Skoob Bookshelf Exporter

<h1 align="center">
<br>
  <img src=https://www.folhaunica.com.br/wp-content/uploads/2022/06/skoob.jpg" alt="Skoob" width="120">
<br>
<br>
Skoob Bookshelf Exporter
</h1>

<p align="center">Este script permite ao usuário exportar todas as informações da estante do Skoob para um arquivo CSV</p>

[//]: # "Adicione seus gifs/imagens aqui:"

<hr />

## Funcionalidades

[//]: # "Adicione as funcionalidades do seu projeto aqui:"

Tecnologias Aplicadas

- 🧾 **JavaScript**;
- 💻 **Fetch API**;

## Começando

1. Faça login no site do Skoob no Desktop (não funciona em dispositivos móveis);
2. Acesse a página do usuário cujo ID está na URL, por exemplo, `https://www.skoob.com.br/usuario/1234567`;
3. Abra o DevTools do navegador (ctrl + shift + i para o Google Chrome);
4. Acesse a aba 'Console';
5. Copie o script a seguir e pressione 'Enter':


```javascript
function getUserIdFromUrl(){const t=window.location.href.match(/usuario\/(\d+)/);return t?t[1]:null}const userId=getUserIdFromUrl();if(userId){const t=`https://www.skoob.com.br/v1/bookcase/books/${userId}/shelf_id:0`,e=20,s={1:"Lidos",2:"Lendo atualmente",3:"Quero ler",4:"Relendo",5:"Abandonou",6:"Desejado"};function decodeText(t){try{return decodeURIComponent(escape(t))}catch(e){return t}}function normalizeText(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}async function fetchAllBooks(){let s=1,a=[],o=0;try{for(;;){const i=`${t}/page:${s}/limit:${e}/`,n=await fetch(i);if(!n.ok)throw new Error(`HTTP error! status: ${n.status}`);const c=await n.json();if(0===c.response.length){console.log("Nenhum livro encontrado nesta página, terminando o loop.");break}const r=c.response.map((t=>{const{edicao:e,estatisticas:s,...a}=t,o={};for(const t in e)if("tempo_leitura"===t){const s=e[t];let a=0;s.dias&&(a+=24*s.dias),s.horas&&(a+=s.horas),s.minutos&&(a+=s.minutos/60),o["edicao.tempo_leitura_horas"]=a.toFixed(2)}else o[`edicao.${t}`]=decodeText(e[t]);const i={};for(const t in s)i[`estatisticas.${t}`]=s[t];return{...a,...o,...i,edicaoId:e.id}}));if(a=a.concat(r),0===o&&(o=c.paging.page_count,console.log(`Total de páginas a serem buscadas: ${o}`)),console.log(`Página ${s} de ${o}`),s++,!c.paging.next_page)break}const i={};a.forEach((t=>{i[t.edicaoId]=t})),console.log(`Total de livros únicos encontrados: ${a.length}`);const n=await fetchBookDetails(i);for(const t in n)i[t]={...i[t],...n[t]};console.log("Consulta da API concluída. Preparando para gerar o CSV..."),console.log("Iniciando a geração do CSV..."),generateAndDownloadCSV(i)}catch(t){console.error("Error fetching books:",t)}}async function fetchBookDetails(t){const e={},s=Object.values(t);async function a(t,a){const o=t.edicaoId,i=`https://www.skoob.com.br/v1/book/${o}/user_id:${userId}/stats:true/`;try{const t=await fetch(i);if(!t.ok)throw new Error(`HTTP error! status: ${t.status}`);const n=await t.json(),{estatisticas:c,...r}=n.response,d={};for(const t in c)d[`estatisticas.${t}`]=c[t];e[o]={...r,...d};const l=((a+1)/s.length*100).toFixed(2);console.log(`Progresso: ${l}% - Livro ${a+1} de ${s.length}`)}catch(t){console.error(`Error fetching details for book ${o}:`,t)}}return await async function(){for(let t=0;t<s.length;t+=5){const e=s.slice(t,t+5);await Promise.all(e.map(((e,s)=>a(e,t+s))))}}(),e}function generateAndDownloadCSV(t){const e=["edicao.titulo","ano","autor","edicao.paginas","edicao.tempo_leitura_horas","estatisticas.pr_recomendam","leitores","tipo","estatisticas.ranking","estatisticas.qt_abandonei","estatisticas.qt_avaliadores","estatisticas.qt_desejados","estatisticas.qt_emprestados","estatisticas.qt_estantes","estatisticas.qt_favoritos","estatisticas.qt_homens","estatisticas.qt_lendo","estatisticas.qt_lido","estatisticas.qt_meta","estatisticas.qt_mulheres","estatisticas.qt_relendo","estatisticas.qt_resenhas","estatisticas.qt_tenho","estatisticas.qt_troco","estatisticas.qt_vouler"],a=Object.values(t).map((t=>({"edicao.titulo":normalizeText(decodeText(String(t["edicao.titulo"]||"").replace(/,/g,""))),ano:normalizeText(decodeText(String(t.ano||"").replace(/,/g,""))),autor:normalizeText(decodeText(String(t.autor||"").replace(/,/g,""))),"edicao.paginas":t["edicao.paginas"]||"","edicao.tempo_leitura_horas":String(t["edicao.tempo_leitura_horas"]||"").replace(/,/g,""),"estatisticas.pr_recomendam":t["estatisticas.pr_recomendam"]||"",leitores:normalizeText(decodeText(String(t.leitores||"").replace(/,/g,""))),tipo:s[t.tipo]||"","estatisticas.ranking":(10*parseFloat(t["estatisticas.ranking"])).toFixed(2)||"","estatisticas.qt_abandonei":t["estatisticas.qt_abandonei"]||"","estatisticas.qt_avaliadores":t["estatisticas.qt_avaliadores"]||"","estatisticas.qt_desejados":t["estatisticas.qt_desejados"]||"","estatisticas.qt_emprestados":t["estatisticas.qt_emprestados"]||"","estatisticas.qt_estantes":t["estatisticas.qt_estantes"]||"","estatisticas.qt_favoritos":t["estatisticas.qt_favoritos"]||"","estatisticas.qt_homens":t["estatisticas.qt_homens"]||"","estatisticas.qt_lendo":t["estatisticas.qt_lendo"]||"","estatisticas.qt_lido":t["estatisticas.qt_lido"]||"","estatisticas.qt_meta":t["estatisticas.qt_meta"]||"","estatisticas.qt_mulheres":t["estatisticas.qt_mulheres"]||"","estatisticas.qt_relendo":t["estatisticas.qt_relendo"]||"","estatisticas.qt_resenhas":t["estatisticas.qt_resenhas"]||"","estatisticas.qt_tenho":t["estatisticas.qt_tenho"]||"","estatisticas.qt_troco":t["estatisticas.qt_troco"]||"","estatisticas.qt_vouler":t["estatisticas.qt_vouler"]||""}))),o=[e.join(","),...a.map((t=>e.map((e=>t[e]??"")).join(",")))].join("\n"),i=new Blob([o],{type:"text/csv;charset=utf-8;"}),n=URL.createObjectURL(i),c=document.createElement("a");c.setAttribute("href",n),c.setAttribute("download","books.csv"),c.style.visibility="hidden",document.body.appendChild(c),console.log("Download em progresso..."),c.click(),document.body.removeChild(c),console.log("Download iniciado.")}fetchAllBooks()}else console.error("ID do usuário não encontrado na URL.");
```
<hr />

## Importante


Pode ser necessário dar permissão para habilitar o download.


<hr />

## Dividir texto em diferentes colunas


Abra a planilha do Excel onde você deseja salvar os dados e clique na aba Dados.
1. Selecione a célula ou coluna que contém o texto que você deseja dividir.
2. Selecione Dados > Texto para Colunas.
3. No Assistente de Conversão de Texto para Colunas, selecione Delimitado > Avançar.
4. Selecione os Delimitadores para seus dados. Neste caso, 'vírgula'.
5. Selecione Avançar.
6. Selecione o Destino em sua planilha, que é onde você deseja que os dados divididos apareçam.
7. Selecione Concluir.


[//]: # "Adicione seu vídeo aqui:"

---
