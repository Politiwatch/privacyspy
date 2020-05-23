const gulp = require("gulp");
const mustache = require("gulp-mustache");
const postcss = require("gulp-postcss");
const purgecss = require("gulp-purgecss");

function build() {
  return gulp
    .src("./src/views/**/*")
    .pipe(
      mustache({
        msg: "Hello Gulp!",
      })
    )
    .pipe(gulp.dest("./"));
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

gulp.watch("src/views/**/*.pug", function (cb) {
  build();
  cb();
});

if (process.env.NODE_ENV === "production") {
  exports.default = gulp.series(build, css, purge);
} else {
  exports.default = gulp.series(build, css);
}
