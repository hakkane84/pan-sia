# Pan-Sia
Trans-network data collector for Sia-derived blockchains

Pan-Sia is an script that collects key stats of multiple Sia forked clients. It is the software that collects and processes the data of https://keops.cc/pan-sia

## Requirements

* One daemon running for each blockchain to be analyzed
* The `explorer` module of the daemons needs to be enabled
* Node.js installed

## Setup

* `npm install` for installing dependencies
* Configure the array `daemons` with each daemon to be scored
* Set the output path for the generated API files (variable `webpath`)
* Run with the command `node pan-sia.js`
