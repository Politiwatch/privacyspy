module.exports = {
    reporters: ["default", ["jest-junit", {
        suiteName: "Automated Tests",
        classNameTemplate: (vars) => {
            let affectedFile = vars.classname.match(/\[(.+)\]/);
            if (affectedFile != null) {
                return affectedFile[1];
            } else {
                return vars.filepath;
            }
        },
        titleTemplate: (vars) => {
            return (vars.classname.replace(/\[(.+)\]/, "") + " " + vars.title).replace(/^\s+/, "");
        }
    }]
    ]
};