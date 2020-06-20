import { Product } from "../parsing/types";
const { URL } = require("url");
import { loadProducts, loadRubric, loadContributors } from "../parsing/index";

const sizeOf = require("image-size");
const axios = require("axios").default;
const JSSoup = require("jssoup").default;
const fs = require("fs");

let products = loadProducts(loadRubric(), loadContributors());

(async () => {
  for (let product of products) {
    try {
      if (fs.readdirSync("icons/").find(item => item.split(".")[0] === product.slug)) {
        console.log("An icon is already present for " + product.slug + ", skipping...");
        continue;
      }
      await getIcon(product);
    } catch (err) {
      console.log(
        "An error occurred while loading an icon for " + product.slug
      );
    }
  }
})();

async function getIcon(product: Product) {
  let potentialIcons = [];
  for (let hostname of product.hostnames) {
    try {
      let homeUrl = "http://" + hostname;
      let response = await axios.get(homeUrl);
      let soup = new JSSoup(response.data);
      for (let link of soup.findAll("link")) {
        if (
          link.attrs.rel &&
          [
            "icon",
            "apple-touch-icon",
            "fluid-icon",
            "apple-touch-icon-precomposed",
            "shortcut icon",
          ].includes(link.attrs.rel.toLowerCase()) &&
          link.attrs.href !== undefined
        ) {
          potentialIcons.push(new URL(link.attrs.href, response.request.res.responseUrl).href);
        }
      }
    } catch (err) {
      console.log("An error occured while fetching " + hostname);
    }
  }
  
  let wroteIcon = false;
  for (let iconUrl of potentialIcons){
    if (wroteIcon) {
      break;
    }
    try {
      console.log(iconUrl);
      let icon = await axios.get(iconUrl, {
        responseType: 'arraybuffer'
      }).then(response => Buffer.from(response.data, 'binary'));
      let dimensions = sizeOf(icon);
      if (Math.abs(1 - dimensions.width / dimensions.height) <= 0.2 && dimensions.width >= 64 && icon.length < 30000){
        let dest = "icons/" + product.slug + "." + iconUrl.split(".").slice(-1).pop().split("#")[0].split("?")[0];
        console.log(`Writing icon ${dimensions.width}x${dimensions.height} icon to ${dest}`)
        fs.writeFileSync(dest, icon);
        wroteIcon = true;
      }
    } catch(err) {
      console.log(err);
      console.log("An error occurred while trying to get an icon: " + err);
    }
  }
  console.log(product.slug + ": " + potentialIcons.length + " potential icons");
  if (!wroteIcon){
    console.log("    ...couldn't find a suitable icon.");
  }
}
