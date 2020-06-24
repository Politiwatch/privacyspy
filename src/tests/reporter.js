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
            let fileName = test.fullName.match(/\[(.+)\]/);
            if (fileName !== null) {
              fileName = fileName[1];
            }
            let error = test.fullName.replace(/\[(.+)\]/, "").replace(/^\s+/, "");
            console.error(`Error file=${fileName || ""} message=${error}`);
          }
        }
      }
    }
  }
}

module.exports = Reporter;