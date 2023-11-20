# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2020-08-17

### Added

- Perl is now supported through 
  [Simple Perl (support for perltidy and perlcritic)](https://marketplace.visualstudio.com/items?itemName=zhiyuan-lin.simple-perl) 
  and 
  [Perl (language server and debugger)](https://marketplace.visualstudio.com/items?itemName=richterger.perl)
- Extension now prompts you to install dependent extensions if you don't already have them installed

### Fixed

- State Tool failed to install if no workspace was opened
- Extension sometimes didn't load if no workspace was opened
- Terminal and State Tool configuration is now more robust (less prone to errors if you manually change paths / uninstall)


## [1.0.6] - 2020-08-06

### Added

- Prompt to install dependent extensions

### Fixed

- Perl extensions were incorrectly dependent on one another

## [1.0.5] - 2020-07-30

### Changed

- Updated readme

## [1.0.4] - 2020-07-30

### Fixed

- Only log exceptions caused by this extension

## [1.0.3] - 2020-07-30

### Added

- Added rollbar logging so we can address previously unknown bugs

### Changed

- Updated Readme

## [1.0.2] - 2020-07-23

### Fixed

- State Tool installation
- Runtime environments activating when no activestate.yaml exists

## [1.0.1] - 2020-07-15

### Changed

- Updated readme

## [1.0.0] - 2020-07-15

### Added

- Initial release
