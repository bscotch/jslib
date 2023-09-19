# Pathy

Whether you're trying to normalize between POSIX-style and Windows-style separators, sort a bunch of path strings in a useful way, or easily find or read files... working with file paths is a huge pain.

This package provides a single main export, the `Pathy` class, which is an immutable instance representing a path and providing a bunch of useful methods for common path and file operations.

## Features

- **Immutable**. All methods return new instances, so you can chain operations together without worrying about mutating the original.
- **TypeScript-friendly**. All methods are typed, and the class is generic so you can specify the type of the data that will be read from and written to files.
- **Automatic file parsing**. When reading a file, it is automatically parsed based on the extension for common, JavaScript-compatible types like JSON, JSONC, JSON5, and YAML.
- **Automatic file stringification**. Files are also automatically stringified based on the file extension!
- **Automatic file validation**. Provide a ZOD schema (or anything with a `parse()` function) to guarantee that the file contents are what you claim they are, on both read and write.
- **Automatic path normalization**. All paths are normalized to use the POSIX path separator (`/`) and to be absolute (even Windows apps support POSIX-style paths). `file:` protocol URLs are automatically converted to paths.
- **Automatic stringification**. Built-in `toString` and `toJSON` methods make it so that Pathy instances are automatically converted to strings when used in string contexts or JSON-stringified.
- **Tons of helpers**. Have trouble remembering whether an "extension" includes the dot or not? Want to easily find a config file higher up in the tree? Need to know if a path is a file or a directory? Want to find the common ancestor of two paths? Pathy methods help with all of that and more.

## Requirements

- Node.JS 16+ (ESM only)

## Installation

Install [from npm](https://www.npmjs.com/package/@bscotch/pathy), via your package manager of choice.

For example: `npm install @bscotch/pathy` or `pnpm add @bscotch/pathy`

## Usage

```ts
import {pathy, Pathy} from '@bscotch/pathy';

// `pathy` is a helper function that creates a `Pathy` instance,
// so `pathy("my/path")` and `new Pathy("my/path")` are functionally
// equivalent.

const myDir = pathy("my/directory");

// Get all of the files in a directory, recursively
const myFiles = await myDir.listChildrenRecursively();

// Do the same, but convert the paths to plain strings
// with the proper types!
const myFilesAsStrings = await myDir.listChildrenRecursively({
  transform(path){
    return path.absolute;
  }
});

// Create new paths based on a starting one
const myConfigPath = myDir.join("config.yaml");
const myConfigPathAsJson = myConfigPath.changeExtension('json');
const myDirAgain = myConfigPath.up(); // Goes up the tree 1 spot

// When reading a file, it is automatically parsed based on
// the extension for common, JavaScript-compatible types like
// JSON, JSONC, JSON5, and YAML.
const myConfig = await myConfigPath.read();

// Files are also automatically stringified based on the
// file extension!
myConfig.someField = "a new value!";
await myConfigPath.write(myConfig);

// Provide a ZOD schema (or anything with a `parse()` function)
// to guarantee that the file contents are what you claim they are,
// on both read and write.
import {z} from 'zod';
const myConfigValidator = z.object({someField: z.string().default('whatever')});
const myTypedConfigPath = myConfigPath.withValidator(myConfigValidator);
const myParsedConfigUnlessError = await myTypedConfigPath.read();
// ^^ typed as `{someField: string}`
await myTypedConfigPath.write({someField: 100}); // Will throw!

// Ask questions about a path
await myDir.isFile();
await myDir.isDirectory();
myDir.isRoot;
myDir.hasExtension('png');
myDir.hasExtension('.png'); // Decimal or not? Doesn't matter, 
                            // normalized behind the scenes!
myDir.isParentOf(myConfigPath);
await myDir.exists();
await myDir.isEmptyDirectory();
await myDir.listSiblings();
myDir.equals('some\\other\\dir'); // Normalizes first

// Find a config file higher up in the tree
const packageJsonPath = await myDir.findInParents("package.json");

// Do stuff with files and folders
await myDir.ensureDirectory();
await myDir.copy('some/other/dir');
await myDir.delete();

// Stringify!
// Defaults to an absolute POSIX path when used in string-casting contexts.
const myPathString = `${myDir}`;
// Pass arguments to `toString()` to change that:
const myWindowsRelativePathString = myDir.toString({relative:true, format: 'win32'});
// When JSON-stringified, Pathy instances are auto-converted to strings:
const jsonStringified = JSON.stringify({myDir, yep:true});
// ^^ '{"myDir": "/full/path/to/my/dir", "yep": true}'

// Miscellaneous!
Pathy.explode("my/path");
Pathy.lineage("/my/whole/path"); // ["/", "/my", "/my/whole", "/my/whole/path"]
['my/path/1', 'my/path','mypath'].sort(Pathy.compare);
```