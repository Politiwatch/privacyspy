let gulp = require("gulp");
let mustache = require("gulp-mustache");
let postcss = require("gulp-postcss");
let purgecss = require("gulp-purgecss");
let del = require("del");

gulp.task("cleanDist", () => {
  return del("./dist");
});

gulp.task("buildTemplates", () => {
  return gulp
    .src(["./src/templates/**/*.html"])
    .pipe(mustache({}))
    .pipe(gulp.dest("./dist"));
});

gulp.task("collectStatic", () => {
  return gulp
    .src(["./src/static/**/*", "!./src/static/**/*.css"])
    .pipe(gulp.dest("./dist/static/"));
});

gulp.task("buildCss", () => {
  return gulp
    .src(["./src/static/css/**/*.css"])
    .pipe(
      postcss([
        require("postcss-import"),
        require("tailwindcss")("tailwind.config.js"),
        require("autoprefixer"),
      ])
    )
    .pipe(gulp.dest("./dist/static/css/"));
});

gulp.task("purge", () => {
  return gulp.src(["./dist/static/css/**/*.css"]).pipe(
    purgecss({
      content: ["./dist/**/*.html"],
    })
  );
});

gulp.watch("src/templates/**/*.html", () => {
  return gulp
    .src(["./src/templates/**/*.html"])
    .pipe(mustache({}))
    .pipe(gulp.dest("./dist"));
});

gulp.task(
  "default",
  gulp.series([
    "cleanDist",
    "buildTemplates",
    "collectStatic",
    "buildCss",
    "purge",
  ])
);
