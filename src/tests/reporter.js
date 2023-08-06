const fs = require("fs");

class Reporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    if (process.env.TEST_ENVIRONMENT === "github") {
      for (let suite of results.testResults) {
        for (let test of suite.testResults) {
          if (test.status !== "passed") {
            let fileNameSearcher = test.fullName.match(/\[(.+)\]/);
            let lineSearcher = test.fullName.match(/{(.+)}/);
            let fileName = null;
            let lineNumber = 1;
            if (fileNameSearcher !== null) {
              fileName = fileNameSearcher[1];
              if (lineSearcher !== null) {
                let search = lineSearcher[1];
                let file = fs.readFileSync(fileName, {
                  encoding: "utf8",
                });
                let innerFileSearch = file.match(search);
                if (innerFileSearch !== null) {
                  lineNumber = file
                    .slice(0, innerFileSearch.index)
                    .split("\n").length;
                }
              }
            }
            let error = test.fullName
              .replace(/\[(.+)\]/, "")
              .replace(/{(.+)}/, "")
              .replace(/^\s+/, "")
              .replace(/\s\s+/, " ");
            console.error(
              `Error file=${fileName || ""} line=${lineNumber} message=${error}`
            );
          }
        }
      }
    }
  }
}

module.exports = Reporter;
