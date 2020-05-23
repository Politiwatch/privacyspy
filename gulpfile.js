const gulp = require("gulp");
const pug = require("gulp-pug");
const postcss = require("gulp-postcss");
const purgecss = require("gulp-purgecss");

function build() {
  return gulp.src("./src/views/index.pug").pipe(pug()).pipe(gulp.dest("./"));
}

function css() {
  return gulp
    .src("./src/tailwind.css")
    .pipe(postcss([require("tailwindcss"), require("autoprefixer")]))
    .pipe(gulp.dest("./static/css/"));
}

function purge() {
  return gulp
    .src("./static/*.css")
    .pipe(
      purgecss({
        content: ["**/*.html"],
      })
    )
    .pipe(gulp.dest("./static/css"));
}

if (process.env.NODE_ENV === "production") {
  exports.default = gulp.series(build, css, purge);
} else {
  exports.default = gulp.series(build, css);
}
