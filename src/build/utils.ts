import { Product, RubricSelection, Update } from "../parsing/types";

const gulp = require("gulp");
const rename = require("gulp-rename");
const hb = require("gulp-hb");
const hbHelpers = require("handlebars-helpers");

export function hbsFactory(data: object = {}) {
  return hb()
    .partials("./src/templates/partials/**/*.hbs")
    .data({
      ...(data["products"] && {
        // landing page, API endpoint
        api: getExtensionAPI(data["products"]),
        featured: getFeaturedPolicies(data["products"]),
      }),
      ...(data["product"] && {
        // product page
        timeline: getUpdatesTimeline(data["product"].updates),
        rubricCategories: getRubricCategories(data["product"].rubric),
      }),
      ...data,
    })
    .helpers(hbHelpers())
    .helpers({
      ratioColorClass,
      getMonth,
    });
}

export function getProductPageBuildTasks(products: Product[]) {
  const productPageBuildTasks = [];
  for (const product of products) {
    const taskName = `build ${product.slug}`;
    gulp.task(taskName, () => {
      return gulp
        .src("./src/templates/pages/product.hbs")
        .pipe(hbsFactory({ product: product }))
        .pipe(rename(`/product/${product.slug}/index.html`))
        .pipe(gulp.dest("./dist/"));
    });
    productPageBuildTasks.push(taskName);
  }

  return productPageBuildTasks;
}

export function getDirectoryPagesTasks(products: Product[]) {
  const MAX_PER_PAGE = 30;

  products = [...products, ...products, ...products, ...products, ...products];
  products = [...products, ...products];

  const pageCount = Math.ceil(products.length / MAX_PER_PAGE);

  const directoryPagesTasks = [];
  for (let i = 0; i < pageCount; i++) {
    const taskName = `build directory page #${i + 1}`;
    gulp.task(taskName, () => {
      return (
        gulp
          .src("./src/templates/pages/directory.hbs")
          .pipe(
            hbsFactory({
              listings: products.slice(
                i * MAX_PER_PAGE,
                Math.min(products.length, i * MAX_PER_PAGE + MAX_PER_PAGE)
              ),
              pages: [...Array(pageCount).keys()].map(String),
              currentPage: i.toString(),
            })
          )
          // the first page is directory, the second page is directory/2
          .pipe(rename(`/directory/${i == 0 ? "" : i + 1 + "/"}index.html`))
          .pipe(gulp.dest("./dist/"))
      );
    });
    directoryPagesTasks.push(taskName);
  }

  return directoryPagesTasks;
}

function getFeaturedPolicies(products: Product[]): Product[] {
  return products.filter((item) => {
    return [
      "google",
      "apple",
      "facebook",
      "microsoft",
      "amazon",
      "netflix",
    ].includes(item.slug);
  });
}

function getExtensionAPI(products: Product[]) {
  return products.map((product) => {
    return {
      name: product.name,
      hostnames: product.hostnames,
      slug: product.slug,
      score: product.score,
      last_updated: product.lastUpdated,
    };
  });
}

function ratioColorClass(ratio: number): string {
  if (ratio < 0.35) {
    return "text-red-500";
  } else if (ratio < 0.7) {
    return "text-yellow-500";
  } else {
    return "text-green-500";
  }
}

function getMonth(order: number): string {
  switch (order) {
    case 1:
      return "Jan.";
    case 2:
      return "Feb.";
    case 3:
      return "Mar.";
    case 4:
      return "Apr.";
    case 5:
      return "May";
    case 6:
      return "June";
    case 7:
      return "July";
    case 8:
      return "Aug.";
    case 9:
      return "Sep.";
    case 10:
      return "Oct.";
    case 11:
      return "Nov.";
    case 12:
      return "Dec.";
    default:
      return "Jan.";
  }
}

function getUpdatesTimeline(updates: Update[]): object {
  const timeline = {};

  for (const update of updates) {
    const date = update.date;
    if (date === undefined) {
      (timeline["general"] = timeline["general"] || []).push(update);
    } else {
      const dateObj = new Date(date);

      // NOTE: years are negative!
      // Since by default JS only sorts object keys in ascending order
      // and only if a key is integer, it is simpler to introduce a negative
      // sign than to create a different data structure and a custom handlebars helper.
      const year = -dateObj.getFullYear();
      const month = dateObj.getMonth();
      if (!(year in timeline)) {
        timeline[year] = {};
      }
      if (!(month in timeline[year])) {
        timeline[year][month] = [];
      }
      timeline[year][month].push(update);
    }
  }

  return timeline;
}

function getRubricCategories(selections: RubricSelection[]): object {
  const categories = {};

  for (const selection of selections) {
    (categories[selection.question.category] =
      categories[selection.question.category] || []).push(selection);
  }

  return categories;
}
