require("dotenv").config();

import { Product, RubricQuestion, Contributor } from "./src/parsing/types";

import {
  loadRubric,
  loadProducts,
  loadContributors,
} from "./src/parsing/index";

import {
  hbsFactory,
  getProductPageBuildTasks,
  getDirectoryPagesTasks,
} from "./src/build/utils";

const gulp = require("gulp");
const postcss = require("gulp-postcss");
const rename = require("gulp-rename");
const del = require("del");

const rubric: RubricQuestion[] = loadRubric();
const contributors: Contributor[] = loadContributors();
const products: Product[] = loadProducts(rubric, contributors);

gulp.task("clean", () => {
  return del("./dist/**/*");
});

gulp.task("build api", () => {
  return gulp
    .src(["./src/templates/pages/api/**/*.json"])
    .pipe(hbsFactory({ rubric, contributors, products }))
    .pipe(gulp.dest("./dist/api/"));
});

gulp.task("build general pages", () => {
  return gulp
    .src(["./src/templates/pages/**/*.hbs", "./src/templates/pages/*.hbs"], {
      ignore: [
        "./src/templates/pages/product.hbs",
        ".src/templates/pages/directory.hbs",
      ],
    })
    .pipe(rename({ extname: ".html" }))
    .pipe(hbsFactory({ rubric, contributors, products }))
    .pipe(gulp.dest("./dist/"));
});

gulp.task(
  "build pages",
  gulp.parallel(
    ...getProductPageBuildTasks(products),
    ...getDirectoryPagesTasks(products),
    "build general pages",
    "build api"
  )
);

gulp.task("collect static", () => {
  return gulp
    .src([
      "./src/static/**/*",
      "!./src/static/**/*.{css,scss}",
      "./node_modules/@fortawesome/fontawesome-free/**/*.{woff2,woff}",
    ])
    .pipe(gulp.dest("./dist/static/"));
});

gulp.task("collect product icons", () => {
  return gulp.src(["./icons/**/*"]).pipe(gulp.dest("./dist/static/icons/"));
});

gulp.task("build css", () => {
  return gulp
    .src(["./src/static/css/base.scss"])
    .pipe(
      postcss(
        [
          require("postcss-import"),
          require("tailwindcss")("tailwind.config.js"),
          require("autoprefixer"),
          ...(process.env.NODE_ENV !== "debug"
            ? [
                require("@fullhuman/postcss-purgecss")({
                  content: ["./dist/**/*.html"],
                }),
              ]
            : []),
        ],
        { syntax: require("postcss-scss") }
      )
    )
    .pipe(rename({ extname: ".css" }))
    .pipe(gulp.dest("./dist/static/css/"));
});

gulp.task(
  "default",
  gulp.series([
    "clean",
    "build pages",
    "collect static",
    "collect product icons",
    "build css",
  ])
);

if (process.env.NODE_ENV === "debug") {
  gulp.watch(
    ["./src/templates/**/*", "./rubric/**/*", "./products/**/*"],
    gulp.series("build pages", "collect static")
  );
  gulp.watch(["./src/**/*.{css,scss}", "build css"]);
}
