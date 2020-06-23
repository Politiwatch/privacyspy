import { Product } from "../parsing/types";
const { URL } = require("url");
import { loadProducts, loadRubric, loadContributors } from "../parsing/index";

const sizeOf = require("image-size");
const axios = require("axios").default;
const JSSoup = require("jssoup").default;
const fs = require("fs");

const products = loadProducts(loadRubric(), loadContributors());

(async () => {
  for (const product of products) {
    try {
      if (
        fs
          .readdirSync("icons/")
          .find((item) => item.split(".")[0] === product.slug)
      ) {
        console.log(
          "An icon is already present for " + product.slug + ", skipping..."
        );
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
  const potentialIcons = [];
  for (const hostname of product.hostnames) {
    try {
      const homeUrl = "http://" + hostname;
      const response = await axios.get(homeUrl);
      const soup = new JSSoup(response.data);
      for (const link of soup.findAll("link")) {
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
          potentialIcons.push(
            new URL(link.attrs.href, response.request.res.responseUrl).href
          );
        }
      }
      potentialIcons.push(
        "https://raw.githubusercontent.com/rdimascio/icons/master/icons/color/" +
          product.slug +
          ".svg"
      );
    } catch (err) {
      console.log("An error occured while fetching " + hostname);
    }
  }

  let wroteIcon = false;
  for (const iconUrl of potentialIcons) {
    if (wroteIcon) {
      break;
    }
    try {
      console.log(iconUrl);
      const type = iconUrl
        .split(".")
        .slice(-1)
        .pop()
        .split("#")[0]
        .split("?")[0]
        .toLowerCase();
      const icon = await axios
        .get(iconUrl, {
          responseType: "arraybuffer",
        })
        .then((response) => Buffer.from(response.data, "binary"));
      const dimensions = sizeOf(icon);
      if (
        Math.abs(1 - dimensions.width / dimensions.height) <= 0.2 &&
        (dimensions.width >= 64 || type == "svg") &&
        icon.length < 30000
      ) {
        const dest = "icons/" + product.slug + "." + type;
        console.log(
          `Writing icon ${dimensions.width}x${dimensions.height} icon to ${dest}`
        );
        fs.writeFileSync(dest, icon);
        wroteIcon = true;
      }
    } catch (err) {
      console.log(err);
      console.log("An error occurred while trying to get an icon: " + err);
    }
  }
  console.log(product.slug + ": " + potentialIcons.length + " potential icons");
  if (!wroteIcon) {
    console.log("    ...couldn't find a suitable icon.");
  }
}
