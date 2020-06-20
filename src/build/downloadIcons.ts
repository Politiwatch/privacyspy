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
      ) &&
      product.slug === "github"
    ) {
      await fetchIcon(product.slug, product.hostnames);
    }
  }
})();

export async function fetchIcon(
  slug: string,
  hostnames: string[]
): Promise<string> {
  return new Promise(async (resolve) => {
    let filename = null;
    for (const hostname of hostnames) {
      await axios
        .get("https://" + hostname)
        .then(async (response) => {
          const soup = new JSSoup(response.data);

          filename = await tryDownloadFromLinkTag(soup, slug, hostname, "icon");

          if (filename === undefined) {
            filename = await tryDownloadFromLinkTag(
              soup,
              slug,
              hostname,
              "apple-touch-icon"
            );
          }

          if (filename === undefined) {
            filename = await tryDownloadFromLinkTag(
              soup,
              slug,
              hostname,
              "fluid-icon"
            );
          }

          if (filename === undefined) {
            filename = await tryDownloadOgImage(soup, slug, hostname);
          }
        })
        .catch(() => {
          // placeholder
        });
    }

    resolve(filename);
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

      const filename = await download(slug, link.attrs.href, hostname);
      console.log("here rel=" + rel + ", hostname = " + hostname);
      if (filename.includes(slug)) {
        return filename;
      }
    }
  }
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

      const filename = await download(slug, link.attrs.content, hostname);
      if (filename.includes(slug)) {
        return filename;
      }
    }
  }
}

async function download(
  slug: string,
  url: string,
  hostname: string
): Promise<string> {
  const ext = getExtension(url);
  return new Promise(async (resolve, reject) => {
    if (ext !== null) {
      if (!url.includes("http")) {
        url = "https://" + hostname + url;
      }
      console.log("inside, url=" + url);
      await probe(url)
        .then(async (result) => {
          if (
            result.width / result.height > 0.95 &&
            result.width / result.height < 1.05 &&
            result.width >= 96 &&
            result.height >= 96
          ) {
            await axios({
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
