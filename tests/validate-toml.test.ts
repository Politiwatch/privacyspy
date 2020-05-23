import fs from 'fs';
import toml from 'toml';

let files: string[] = [];

files = files.concat(fs.readdirSync("./rubric/").filter(name => name.endsWith(".toml")).map(file => "./rubric/" + file));
files = files.concat(fs.readdirSync("./products/").filter(name => name.endsWith(".toml")).map(file => "./products/" + file));

test.each(files)("is valid, readable TOML", file => {
    expect(() => {
        toml.parse(fs.readFileSync(file, {
            encoding: "utf-8",
        }))
    }).not.toThrowError();
});