let gulp = require("gulp");
let handlebars = require('gulp-hb');
let postcss = require("gulp-postcss");
let rename = require('gulp-rename');
let del = require("del");

gulp.task("cleanDist", () => {
  return del("./dist/**/*");
});

gulp.task("buildTemplates", () => {
  return gulp
    .src(["./src/templates/**/*.hbs"])
    .pipe(handlebars().partials("./src/templates/partials/**/*.hbs"))
    .pipe(rename({extname: ".html"}))
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
        // require("@fullhuman/postcss-purgecss")({
        //   content: ["./dist/**/*.html"],
        // })
      ])
    ).pipe(gulp.dest("./dist/static/css/"));
});

gulp.watch(["src/templates/**/*.hbs", "rubric/", "products/"], () => {
  return gulp.series(["buildTemplates"]);
});

gulp.task(
  "default",
  gulp.series([
    "cleanDist",
    "buildTemplates",
    "collectStatic",
    "buildCss",
  ])
);
