var a = document.querySelectorAll('.livro-capa > a')
var content
var urls = []
var title
var rate
var books = []

Array.from(a).forEach(book => {
  urls.push(book.href)
})

urls.forEach(page => {
  //console.log(page)
  fetch(page)
    .then(function (response) {
      switch (response.status) {
        // status "OK"
        case 200:
          return response.text();
        // status "Not Found"
        case 404:
          throw response;
      }
    })
    .then(function (template) {
      content = template;
      title = content.substring(
        content.indexOf("<h1>") + 4,
        content.lastIndexOf("</h1>")
      )
    
      rate = content.substring(
        content.indexOf('class="rating"') + 15
      ).substring(0, 3)
    
      books.push({ title, rate })
      return content
    })
    .catch(function (response) {
      // "Not Found"
      content = response.statusText;
      title = content.substring(
        content.indexOf("<h1>") + 4,
        content.lastIndexOf("</h1>")
      )
    
      rate = content.substring(
        content.indexOf('class="rating"') + 15
      ).substring(0, 3)
    
      books.push({ title, rate })
      return content
    });


  

})


