# ActiveState Platform Extension

Provides an easy way to virtualize and manage Python & Perl runtime environments. Pull your ActiveState runtime directly 
into VS Code whenever you start a new project so you can get started coding quicker!

![screenshot](https://www.activestate.com/wp-content/uploads/2020/07/ActiveState-Platform-Extension.png)

The [ActiveState Platform](https://www.activestate.com/products/platform/) provides pre-built runtimes for open source
languages like Python, Perl and Tcl. It also provides the ability to automatically build, resolve dependencies and
package runtimes tailored for your specific project. [Sign up for a free account](https://platform.activestate.com/create-account),
create a runtime environment for your project or grab a pre-built one, and automatically pull it into VSCode to quickly
enable a sandboxed development environment.

This extension uses the [State Tool](https://www.activestate.com/products/platform/state-tool/) under the hood, which
provides a command line interface to the ActiveState Platform. For questions related to the State Tool, please refer to
our [GitHub repository](https://github.com/ActiveState/cli).

## Features

Here are some of the features that the extension provides:

* Simplify the addition of a Python & Perl language runtime environments to your projects.
* Automatically set up your dev environment to use your configured Python or Perl runtime environment during development for:
  * Intellisense (auto completions)
  * Debugging
  * Integrated terminal sessions
* Basic user management (log-in and user sign-up)
* State Tool (CLI) installation, which simplifies management of your runtime

## Installation

You should follow Microsoft`s official documentation to
[install the extension](https://code.visualstudio.com/docs/editor/extension-gallery).

The ActiveState Platform extension integrates with the following language extensions.

for Python:
* [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) by Microsoft

for Perl:
* [Simple Perl (support for perltidy and perlcritic)](https://marketplace.visualstudio.com/items?itemName=zhiyuan-lin.simple-perl)
* [Perl (language server and debugger)](https://marketplace.visualstudio.com/items?itemName=richterger.perl)

It is recommended you install these extensions if you want to work with these languages.

## Questions & Answers

 To discuss the extension, including any questions you may have, please join the discussion on the [ActiveState
 Community Forums](https://community.activestate.com/t/activestate-plugin-for-visual-studio-code/1863). 
