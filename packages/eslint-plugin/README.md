# eslint-plugin-bscotch

Linting rules for Typescript-forward projects

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-bscotch`:

```sh
npm install eslint-plugin-bscotch --save-dev
```

## Usage

Add `bscotch` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "bscotch"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "bscotch/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here


