# ZionBox-Desktop

This is a secured and decentralized file system on the web!

To install ZionBox, please do it globally with the following command:

```
npm i zionbox-desktop -g
```

Execute from command line using "zionboxdesktop" command.

## Donations
Help us to develop and improve this software!

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BPL6U33XS9HYA)

## Release notes
THIS IS AN INITIAL RELEASE. USE AT YOUR OWN RISK. WE DO NOT PROVIDE ANY KIND OF WARRANTY! You should understand how [IPFS](https://ipfs.io) works before start this adventure.

ZionBox is a system based on the [IPFS](https://ipfs.io) technology. You can see it as a file manager with some additional features. These features are:

- Files structure, as in a regular file manager;
- Ability to share content in a decentralized way. Like in OneDrive, or Google Drive, or another AnyDrive solution, you can store and share content. But in ZionBox your content is not stored in any central server, but in the other ZionBox nodes that somehow are interested at the same content. The moment you access data you automatically become a host for it.
- Strong cryptography. When you add data to the ZionBox you have the option to securely and privately store it, even if the hash of the file is public. You will need the passphrases to access this secured content;
- You can see ZionBox as a vault that you can share space with your friends and organizations;
- You can preview some kind of data from within ZionBox, ex.: movies, musics, etc;
- ZionBox will permit storing critical data and share it securely;
- ZionBoX is a base technology that can be evolved in several different products;

## Pre-requisites for the Desktop and Service modules
- node (For Windows current LTS version is required);
- Python 2.7 (If installing from source code, necessary on Windows to build);
    - If you are not using windows install the necessary tools to build code from npm;
- ipfs;
    - On Windows can be installed with [Chocolatey](https://www.chocolatey.org/);
    - On Mac can be installed with [Homebrew](https://brew.sh/);
    - On Linux, see your distro for a packaged version or build from source code;
    - [IPFS](https://ipfs.io) must be previously initialized with: npm init
- electron (automatically installed through npm);
- node-gyp (to build from source, automatically installed through npm);
- npm (to initialize the ZionBox-Service automatically at boot, automatically installed through npm);

## The entire eco-system compreends the listed software:
- ZionBox-Desktop (GUI Client, currently necessary for all installations, if you don't have a UI Server you cannot use ZionBox currently);
- [ZionBox-Service](https://www.npmjs.com/package/zionbox-service) (necessary to run the Desktop GUI);
- [ZionBox-Mirror](https://www.npmjs.com/package/zionbox-mirror) (OPTIONAL if you want resilience to your data. Manages data to be resilient on your sub-network);
- [ZionBox-Server](https://www.npmjs.com/package/zionboxserver) (NECESSARY AT LEAST ONE SERVER FOR YOUR APPLICATION. Establish connections between the differed nodes on your ZionBox network);

## Post installation requisites:
