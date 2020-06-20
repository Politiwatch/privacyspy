import { Product, Contributor, RubricQuestion } from "../parsing/types";

import { loadProducts, loadContributors, loadRubric } from "../parsing/index";
import { linkSync } from "fs";

const axios = require("axios").default;
const JSSoup = require("jssoup").default;
const fs = require("fs");
const probe = require("probe-image-size");

const rubric: RubricQuestion[] = loadRubric();
const contributors: Contributor[] = loadContributors();
const products: Product[] = loadProducts(rubric, contributors);

(async () => {
  for (const product of products) {
    if (
      !(
        fs.existsSync("icons/" + product.slug + ".jpg") ||
        fs.existsSync("icons/" + product.slug + ".png") ||
        fs.existsSync("icons/" + product.slug + ".svg")
      )
    ) {
      await fetchIcon(product.slug, product.hostnames);
    }
  }
})();

export async function fetchIcon(
  slug: string,
  hostnames: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    let filename = null;
    for (const hostname of hostnames) {
      axios
        .get("https://" + hostname)
        .then(async (response) => {
          const soup = new JSSoup(response.data);

          console.log("attempting link icon");
          filename = await tryDownloadFromLinkTag(soup, slug, hostname, "icon");

          console.log("found " + filename);

          if (filename === null) {
            console.log("attempting link apple-touch-icon");
            try {
              filename = await tryDownloadFromLinkTag(
                soup,
                slug,
                hostname,
                "apple-touch-icon"
              );
            } catch (err) {}
          }

          if (filename === null) {
            console.log("attempting link fluid-icon");
            try {
              filename = await tryDownloadFromLinkTag(
                soup,
                slug,
                hostname,
                "fluid-icon"
              );
            } catch (err) {}
          }

          if (filename === null) {
            console.log("attempting og-image");
            try {
              filename = await tryDownloadOgImage(soup, slug, hostname);
            } catch (err) {}
          }
        })
        .catch((err) => {
          console.log(err);
          console.log("something went wrong!");
        });
    }

    resolve(filename);
  });
}

function getRejectPromise(obj): Promise<string> {
  return new Promise((resolve, reject) => {
    reject(obj);
  });
}

async function tryDownloadFromLinkTag(
  soup: any,
  slug: string,
  hostname: string,
  rel = "icon"
): Promise<string> {
  for (const link of soup.findAll("link")) {
    if ("rel" in link.attrs && link.attrs.rel === rel) {
      if ("sizes" in link.attrs) {
        if (!isAllowedSize(link.attrs.sizes)) {
          continue;
        }
      }
      console.log("trying " + link.attrs.href);
      return download(slug, link.attrs.href, hostname);
    }
  }
  return getRejectPromise("no icons fit requirements");
}

async function tryDownloadOgImage(
  soup: any,
  slug: string,
  hostname: string
): Promise<string> {
  for (const link of soup.findAll("meta")) {
    if ("property" in link.attrs && link.attrs.property === "og:image") {
      if ("sizes" in link.attrs) {
        if (!isAllowedSize(link.attrs.sizes)) {
          continue;
        }
      }

      return download(slug, link.attrs.content, hostname);
    }
  }
  return getRejectPromise("no icons fit requirements");
}

async function download(
  slug: string,
  url: string,
  hostname: string
): Promise<string> {
  const ext = getExtension(url);
  return new Promise((resolve, reject) => {
    if (ext !== null) {
      if (!url.includes("http")) {
        url = "https://" + hostname + url;
      }
      console.log("inside, url=" + url);
      if (ext === ".svg") {
        resolve(null);
      }
      probe(url)
        .then((result) => {
          if (
            result.width / result.height > 0.95 &&
            result.width / result.height < 1.05 &&
            result.width >= 96 &&
            result.height >= 96
          ) {
            axios({
              method: "get",
              url: url,
              responseType: "stream",
            })
              .then((response) => {
                const filename = "icons/" + slug + ext;
                response.data.pipe(fs.createWriteStream(filename));
                resolve(filename);
              })
              .catch(() => {
                resolve(null);
              });
          }
        })
        .catch(() => {
          console.log("error!");
          resolve(null);
        });
    }
  });
}

function isAllowedSize(size: string): boolean {
  const size_i = parseInt(size.split("x")[0]);
  if (size_i >= 72) {
    return true;
  }

  return false;
}

function getExtension(url: string): string {
  if (url.includes(".png")) {
    return ".png";
  } else if (url.includes(".svg")) {
    return ".svg";
  } else if (url.includes(".jpg")) {
    return ".jpg";
  }

  return null;
}
