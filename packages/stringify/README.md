# Stringy

We need to stringify JavaScript data structures for all kinds of reasons.

We have tons of stringification formats covering the gamut of how accuracy in representing JavaScript structures and readability for both machines and people.

Stringification approaches tend to optimize towards *speed* and *interoperability*, and so available tools tend to be highly opinionated and non-extendable.

This project aims to provide a general toolkit for writing custom stringifiers, as well as ready-made stringifiers for common use cases.

**⚠️ This project's API is not at all stable.**

## Usage

```ts
import {jsonStringify} from '@bscotch/stringify'


```