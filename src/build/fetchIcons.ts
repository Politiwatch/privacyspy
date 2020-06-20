import { Product, Contributor, RubricQuestion } from "../parsing/types";

import { loadProducts, loadContributors, loadRubric } from "../parsing/index";

const axios = require("axios").default;
const JSSoup = require("jssoup").default;
const fs = require("fs");
const probe = require("probe-image-size");

(() => {
  const rubric: RubricQuestion[] = loadRubric();
  const contributors: Contributor[] = loadContributors();
  const products: Product[] = loadProducts(rubric, contributors);

  for (const product of products) {
    if (
      !(
        fs.existsSync("icons/" + product.slug + ".jpg") ||
        fs.existsSync("icons/" + product.slug + ".png") ||
        fs.existsSync("icons/" + product.slug + ".svg")
      ) &&
      product.slug === "1password"
    ) {
      fetchIcon(product.slug, product.hostnames)
        .then((filename) => {
          console.log(`Successfully downloaded ${filename}`);
        })
        .catch(() => {
          // placeholder
        });
    }
  }
})();

export async function fetchIcon(slug, hostnames): Promise<string> {
  const __fetchIcon = async (resolve, reject) => {
    for (const hostname of hostnames) {
      await axios
        .get("https://" + hostname)
        .then(async (response) => {
          const soup = new JSSoup(response.data);

          // <link rel="icon">
          let filename = await tryDownloadFromLinkTag(soup, slug, hostname);

          // <link rel="apple-touch-icon"
          if (filename === undefined) {
            filename = await tryDownloadFromLinkTag(
              soup,
              slug,
              hostname,
              "apple-touch-icon"
            );
          }

          // <meta property="og:image">
          if (filename === undefined) {
            filename = await tryDownloadOgImage(soup, slug, hostname);
          }

          if (filename !== undefined) {
            resolve(filename);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }

    reject(`Couldn't fetch an icon for ${slug}`);
  };

  return new Promise(__fetchIcon);
}

async function tryDownloadFromLinkTag(
  soup: any,
  slug: string,
  hostname: string,
  rel = "icon"
) {
  console.log("downloading link with rel = " + rel + " for " + slug);
  for (const link of soup.findAll("link")) {
    if ("rel" in link.attrs) {
      if (link.attrs.rel === rel) {
        if ("sizes" in link.attrs) {
          if (!isAllowedSize(link.attrs.sizes)) {
            continue;
          }
        }
        const filename = await download(slug, link.attrs.href, hostname);
        if (filename !== undefined) {
          return filename;
        }
      }
    }
  }
}

async function tryDownloadOgImage(
  soup: any,
  slug: string,
  hostname: string
): Promise<string> {
  console.log("downloading og image for " + slug);
  for (const link of soup.findAll("meta")) {
    if ("property" in link.attrs) {
      if (link.attrs.property === "og:image") {
        console.log("started");
        const filename = await download(slug, link.attrs.href, hostname);
        if (filename !== undefined) {
          console.log("not undefined");
          return filename;
        }
        console.log("undefined");
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
  const __download = async (resolve, reject) => {
    if (ext !== null) {
      if (!url.includes("http")) {
        url = "https://" + hostname + url;
      }
      await probe(url)
        .then((result) => {
          if (
            result.width / result.height > 0.98 &&
            result.width / result.height < 1.02 &&
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
                console.log("filename: " + filename);
                response.data.pipe(fs.createWriteStream(filename));
                resolve(filename);
              })
              .catch(() => {
                reject("failed");
                console.log("Failed");
              });
          }
        })
        .catch(() => {
          reject("failed");
        });
    }
  };

  return new Promise(__download);
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
