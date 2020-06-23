let index = null;
let products = null;

function buildIndex() {
  return fetch("/api/v2/index.json")
    .then((response) => response.json())
    .then((data) => {
      let index = lunr(function () {
        this.ref("slug");
        this.field("name", { boost: 3 });
        this.field("hostnames");
        this.field("description");

        data.forEach(function (doc) {
          this.add(doc);
        }, this);
      });
      window.localStorage.setItem("products", JSON.stringify(data));
      window.localStorage.setItem("searchIndex", JSON.stringify(index));
      window.localStorage.setItem(
        "searchIndexBuilt",
        JSON.stringify({ time: Date.now() })
      );
      console.log("Search index built!");
    });
}

function loadIndex() {
  index = lunr.Index.load(
    JSON.parse(window.localStorage.getItem("searchIndex"))
  );

  products = {};
  for (let product of JSON.parse(window.localStorage.getItem("products"))) {
    products[product["slug"]] = product;
  }

  console.log("Search index loaded!");
}

function search(query) {
  let results = [];
  let foundProducts = [];
  for (let doc of [...index.search(query + "*"), ...index.search(query)]) {
    if (!foundProducts.includes(doc.ref)){
      results.push(products[doc.ref]);
      foundProducts.push(doc.ref);
    }
  }
  return results;
}

function waitFor(variable, callback) {
  var interval = setInterval(function () {
    if (window[variable] !== null) {
      clearInterval(interval);
      callback();
    }
  }, 200);
}

function onSearchInput() {
  waitFor(
    "index",
    () => {
      let query = document.querySelector("#searchBox").value;
      let dropdown = document.querySelector("#searchDropdown");
      let noResultsComp = document.querySelector("#searchNoResults");
      let resultsComp = document.querySelector("#searchResults");
      if (query.length === 0) {
        dropdown.classList.add("hidden");
      } else {
        dropdown.classList.remove("hidden");
        let results = search(query);
        if (results.length === 0) {
          noResultsComp.classList.remove("hidden");
          resultsComp.classList.add("hidden");
        } else {
          noResultsComp.classList.add("hidden");
          let html = "";
          for (let product of results.slice(0, 8)) {
            html += `
          <a href="/product/${product.slug}/" class="flex rounded items-center outline-none focus:bg-gray-100 px-2 py-2 md:py-1 hover:text-blue-500 searchResult">
            <img src="/static/icons/${product.icon}" class="h-4 w-4 mr-2 rounded">
            ${product.name}
          </a>`;
          }
          resultsComp.innerHTML = html;
          resultsComp.classList.remove("hidden");
        }
      }
    },
    100
  );
}

window.addEventListener("keydown", (event) => {
  if (event.keyCode == 191 && !event.isComposing) {
    event.preventDefault();
    document.querySelector("#searchBox").focus();
  }
  if (
    event.keyCode == 13 &&
    document.querySelector("#searchBox") == document.activeElement
  ) {
    document.querySelector(".searchResult").click();
  }
});

if (
  window.localStorage.getItem("searchIndex") === null ||
  window.localStorage.getItem("products") === null ||
  window.localStorage.getItem("searchIndexBuilt") === null ||
  JSON.parse(window.localStorage.getItem("searchIndexBuilt")) <
    Date.now() - 1000 * 60 * 60 * 24
) {
  buildIndex().then(loadIndex);
} else {
  loadIndex();
}
