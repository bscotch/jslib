# Changelog - @bscotch/pathy

## 2.11.0 (2023-11-13)

### Features

- Now exporting 'safe' functions to enable retries of file operations

## 2.10.1 (2023-11-13)

### Fixes

- Added a 'tries' field to "safe" file i/o to help debug when things go wrong.
- Added missing retry options for file writing

## 2.10.0 (2023-11-13)

### Features

- Added more retry options for file io

## 2.9.0 (2023-09-19)

### Docs

- Added changelog link to the README

### Features

- Bumped all deps

## 2.8.0 (2023-09-19)

### Features

- Added "move" method
- Added aliases for deleting paths, making directories, and listing directory contents

### Fixes

- Removed trace decorators from pathy methods, improving speed of some operations

## 2.7.4 (2023-08-15)

### Fixes

- Resolved issue where Pathy.findChild would not properly handle regex arguments

## 2.7.3 (2023-04-13)

### Fixes

- Added MIT licensing to all packages

## 2.7.2 (2023-04-12)

### Fixes

- Resolved issue where the validator was not properly added during Pathy construction

## 2.7.1 (2023-04-11)

### Docs

- Added more tags to the manifest
- Added the homepage field to the manifest

## 2.7.0 (2023-04-11)

### Docs

- Added a README

### Features

- Added the 'explode' and 'lineage' static methods as member methods

### Fixes

- Updated all deps