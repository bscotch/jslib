# Config Utilities

Configuration file management can be a pain. This package contains a collection of helpers to make config management easier.

## JSON Config Files

In the JavaScript/Typescript ecosystem, most configuration files are stored as JSON files.

### `ConfigFile` base class

This package provides a base `ConfigFile` base class to make saving, loading, and typing JSON-based configuration files easier.

- Uses [JSON5](https://json5.org/) for loading, so that your config files can contain comments and other JSON-incompatible features.
- Can follow `"extends"` fields.

The following is a sample for how to create a custom config class using this package's base class.

```ts
import { ConfigFile, ConfigFileOptions } from '@bscotch/config';

interface MyConfigOptions {
  someValue: string;
  someOtherValue: { hello: number }[];
}

class MyConfigClass extends ConfigFile<MyConfigOptions> {
  constructor(
    options: Omit<ConfigFileOptions<MyConfigOptions>, 'defaultBaseName'>,
  ) {
    super({ defaultBasename: 'my-config.json', ...options });
  }

  async cumulativeOptions() {
    // Get all parsed config data, following
    // "extends" fields, so that you can apply
    // custom resolution logic.
    const chain = await this.inheritenceChain();
    const options = chain.reduce((cumulative, current) => {
      Object.assign(cumulative, current);
      return cumulative;
    }, {});
    return options;
  }
}

// Load a config file (defaults to searching cwd)
const config = new ConfigFile<MyConfig>();
const options = await config.cumulativeOptions();
```

### `PackageJson` class

This package provides a `PackageJson` class for working with [`package.json` files](https://docs.npmjs.com/cli/v7/configuring-npm/package-json). It extends the `ConfigFile` base class.

- Bump versions
- Check for and change dependencies
- Discover all files that would be included by `npm pack`
- Enforce/check publish-ability
- Supports monorepos
  - Follows dependencies that use the `file:` protocol.
  - Checks publish-ability based on local dependencies, e.g. if a local dep is private the package is treated as unpublishable.

```ts
import { PackageJson } from '@bscotch/config';

// You can extend the PackageJson type with custom
// fields.
interface CustomFields {
  myField: string;
  myOtherField: { hello: number }[];
}

// Find the nearest package.json and load it
// (starts in cwd by default)
const pkg = await PackageJson.findPackageJson<CustomFields>();

// Check for a dependency
const tsDep = pkg.findDependency('typescript');
// -> {version: '^4.7.3', type: 'devDependencies'}

// Bump the version
await pkg.bumpVersion('minor');
```

### `TsConfig` class

Typescript configuration options are specified with [`tsconfig.json` files](https://www.typescriptlang.org/tsconfig). These files are loaded and used by a wide variety of tools, though any given tool may only support a subset of options or config versions.

The `TsConfig` helper class provides utilities for various features that are useful for managing a Typescript project, mostly for simplifying the creation of tools that operate on Typescript projects.

- Get cumulative options by following "extends" fields.
- Find all source files that would be included, even those included via `"references"`.
- Check if a given path/module is included by a Typescript project, with alias resolution.

```ts
import { TsConfig } from '@bscotch/config';

// Find the nearest tsconfig.json file.
const mainConfig = await TsConfig.resolve();

// Get the cumulative config options, resulting
// from recursively following paths in the "extends" field.
const options = await mainConfig.cumulativeConfig();

// Get a list of all `tsconfig`s that are part of this
// project, by recursively following the paths found in
// the "references" field.
const configs = await mainConfig.resolveProjectReferenceTree();
```
