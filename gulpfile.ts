import { Product, RubricQuestion } from "./src/parsing/types";
import { loadRubric, loadProducts } from "./src/parsing/index";

let gulp = require("gulp");
let postcss = require("gulp-postcss");
let rename = require("gulp-rename");
let del = require("del");
let hb = require("gulp-hb");
let hbHelpers = require("handlebars-helpers");
var through = require("through2");
let toml = require("@iarna/toml");

let rubric: RubricQuestion[] = loadRubric();
let products: Product[] = loadProducts(rubric);
let api: object = products.map(product => {
  return {
    name: product.name,
    hostnames: product.hostnames,
    slug: product.slug,
    score: product.score,
    last_updated: product.lastUpdated,
    has_warnings_active: product.warnings.length > 0,
  }
})

function hbsFactory(additionalData: object): any {
  return hb()
    .partials("./src/templates/partials/**/*.hbs")
    .data({
      rubric: rubric,
      products: products,
      api: api,
      ...additionalData,
    })
    .helpers(hbHelpers())
    .helpers({
      ratioColorClass: (ratio: number) => {
        if (ratio < 0.35) {
          return "text-red-500";
        } else if (ratio < 0.7) {
          return "text-yellow-500";
        } else {
          return "text-green-500";
        }
      },
    });
}

gulp.task("clean", () => {
  return del("./dist/**/*");
});

gulp.task("build general pages", () => {
  return gulp
    .src("./src/templates/**/*.{hbs}", {
      ignore: "./src/templates/product.hbs",
    })
    .pipe(rename({ extname: ".html" }))
    .pipe(gulp.src("./src/templates/**/*.json"))
    .pipe(hbsFactory({}))
    .pipe(gulp.dest("./dist/"));
});

// Product page building
// TODO: Make a bit nicer
let productPageBuildTasks = [];
for (let product of products) {
  let taskName = `build ${product.slug}`;
  gulp.task(taskName, () => {
    return gulp
      .src("./src/templates/product.hbs")
      .pipe(hbsFactory({ product: product }))
      .pipe(rename(`/product/${product.slug}/index.html`))
      .pipe(gulp.dest("./dist/"));
  });
  productPageBuildTasks.push(taskName);
}

gulp.task(
  "build pages",
  gulp.parallel(...productPageBuildTasks, "build general pages")
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
          // require("@fullhuman/postcss-purgecss")({
          //   content: ["./dist/**/*.html"],
          // })
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

gulp.watch(
  ["./src/templates/**/*", "./rubric/**/*", "./products/**/*"],
  gulp.series("build pages", "collect static")
);

gulp.watch(["./src/**/*.{css,scss}", "build css"]);
