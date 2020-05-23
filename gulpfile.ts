let gulp = require("gulp");
let mustache = require("gulp-mustache");
let postcss = require("gulp-postcss");
let purgecss = require("gulp-purgecss");
let del = require("del");
gulp.task("cleanDist", async () => {
  return del("./dist");
})

gulp.task("buildTemplates", async () => {
  return gulp
    .src(["./src/templates/**/*.html"])
    .pipe(
      mustache({})
    )
    .pipe(gulp.dest("./dist"));
});

gulp.task("collectStatic", async () => {
  return gulp.src(["./src/static/**/*", "!./src/static/**/*.css"]).pipe(gulp.dest("./dist/static/"))
});

gulp.task("buildCss", async () => {
  return gulp
    .src(["./src/static/css/**/*.css"])
    .pipe(postcss([require("postcss-import"), require("tailwindcss"), require("autoprefixer")]))
    .pipe(
      purgecss({
        content: ["./dist/**/*.html"],
      })
    )
    .pipe(gulp.dest("./dist/static/css/"));
});

gulp.task("default", gulp.series(["cleanDist", "buildTemplates", "collectStatic", "buildCss"]));
