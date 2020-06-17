import lunr from "lunr";

let policies = {{api}};

lunr(function () {
    this.ref('slug');
    this.field('name', {boost: 3});
    this.field('description');
    this.field('hostname');
  
    policies.forEach(function (doc) {
      this.add(doc)
    }, this);
})  

function search(string) {

}