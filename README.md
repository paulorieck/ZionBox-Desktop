# ZionBox-Desktop

THIS PROJECT IS NOT STORED ON NPM ANYMORE!!! IF YOU WANT TO ACCESS THE SOURCE CODE, YOU CAN FIND IT AT [GitHub](https://github.com/paulorieck/ZionBox-Desktop)

- Do you need a place to safely store Crypto Wallets passwords, or any other kind of data?
- Do you want to share content in a safe way?
- Do you want to share your family photographs and at the same time keep them away from clouds surveillance?
- Do you want a distributed media center data store?
- Do you want to make your data resilient and safe at the same time?
- Do you want that, even if someone has physical access to your machine, your data keeps secured inside a vault?
- Do you own an organization and want a safer manner to store your data?
- Do you need a place to store documents and don't want to store it in raw format in your disk?
- Do you want to store, send and receive documents anonymously across the internet?
- Have you concerns about privacy?
- Have you concerns about the centralization of data on huge data stores?
- Are you comfortable storing and sending your data to and trough a company that stores all information about you to sell advertisements?
- Do you want to contribute to internet's decentralization?

This is a secured and decentralized file system on the web! Keep your data secured from governments and big companies.

We are building a decentralized storage to your files based on the [IPFS - Interplanetary File System](https://ipfs.io). You can choose what content you want to cryptography. You can choose what content you want to share, with or without cryptography.

Our goal is to protect your privacy and your freedom.

![alt text](https://www.gwtk.com.br/imagens_publicas/5d53fa6669775.jpg)

We are building a vault to store your data safely! You have the control of your data!

## Donations
Help us to develop and improve this software!

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BPL6U33XS9HYA)

You're also welcome to help us to code this solution! Feel free to clone this repository!

## Release notes
THIS IS AN INITIAL RELEASE. USE AT YOUR OWN RISK. WE DO NOT PROVIDE ANY KIND OF WARRANTY! You should understand how [IPFS](https://ipfs.io) works before start this adventure.

ZionBox is a system based on the [IPFS](https://ipfs.io) technology. You can see it as a file manager with some additional features. These features are:

- Files structure, as in a regular file manager;
- Ability to share content in a decentralized way. Like in OneDrive, or Google Drive, or another AnyDrive solution, you can store and share content. But in ZionBox your content is not stored in any central server, but in the other ZionBox nodes that somehow are interested at the same content. The moment you access data you automatically become a host for it.
- Strong cryptography. When you add data to the ZionBox you have the option to securely and privately store it, even if the hash of the file is public. You will need the passphrases to access this secured content;
- You can see ZionBox as a vault that you can share space with your friends and organizations;
- You can preview some kind of data from within ZionBox, ex.: movies, musics, etc;
- ZionBox will permit storing critical data and share it securely;
- ZionBox is a base technology that can be evolved in several different products;

## Pre-requisites for the Desktop module
- ipfs;
    - On Windows can be installed with [Chocolatey](https://www.chocolatey.org/);
    - On Mac can be installed with [Homebrew](https://brew.sh/);
    - On Linux, see your distro for a packaged version or build from source code;
    - [IPFS](https://ipfs.io) must be previously initialized with: 
    '''
    npm init
    '''

## Instalation
Just downaload the latest vesrion for your system at [GitHub ZionBox Releases](https://github.com/paulorieck/ZionBox-Desktop/releases)
- Attention! Auto updates are not working at the moment! We are at ALPHA stage. Error will occurr. We are realising new versions almost every day, please, update this software regularly.

## The entire eco-system compreends the listed software:
- ZionBox-Desktop (GUI Client, currently necessary for all installations, if you don't have a UI Server you cannot use ZionBox currently);
- [ZionBox-Mirror](https://www.npmjs.com/package/zionbox-mirror) (OPTIONAL if you want resilience to your data. Manages data to be resilient on your sub-network);
- [ZionBox-Server](https://www.npmjs.com/package/zionboxserver) (NECESSARY AT LEAST ONE SERVER FOR YOUR APPLICATION. Establish connections between the differed nodes on your ZionBox network);

## Post installation requisites:

## License
Copyright (c) 2019 GWTK Software

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.