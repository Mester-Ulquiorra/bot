# Ulquiorra

## Description

Ulquiorra is an all-in-one Discord bot, designed primarily for the Gedanken Versichert Discord server. It is themed around the Bleach character Ulquiorra. Its main purpose is to combine the functionality of multiple bots into one, and to provide a more streamlined experience for the users of the server.

It is a three part system, consisting of the bot itself, a web server (also called UCP, or User Control Panel), and an API.

Because it's designed for one specific server, it is NOT recommended to use this bot on your own server. However, you are free to do so if you wish.

Warning: at the moment, the API is not yet open-source. This will change in the future.

## Installation

To install Ulquiorra, follow these steps:

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Clone commonlib
git clone https://github.com/Mester-Ulquiorra/commonlib.git
cd commonlib

# Install commonlib
bun install
bun run build

# Link commonlib
bun link
cd ..

# Clone the repository
git clone https://github.com/Mester-Ulquiorra/bot.git
cd bot

# Install dependencies
bun install
```

Before you can run Ulquiorra, you need to set up the configuration files and database keys. 

First, set up a MongoDB server. Both the bot and the API connect to MongoDB using certificate files, so you'll need to generate one.

The next step is to setup the config file. An example is provided at src/example.config.ts. You can copy this file to src/config.ts and fill in the necessary values. Here you can already see how strict the bot's design is - it's designed for one specific server, and as such, the config file is very specific.

Finally, set up the internal secret file. Create a file called internal-secret (make sure it's in the root directoy), then generate a random string and put it in the file. You'll have to use the same string when you set up the API.

## Usage

If you're running the bot in a test environment, make sure to create an empty .test file in the root directory. This'll cause following things:
1. More debug messages will be printed in the console.
2. Inside the config file, the values of the `test` object will be used.
3. Some functionality will be altered to make it easier to test.

If you're ready, you can start the bot by running `bun run start`.

A "Successfully logged in" message will be printed in the console, or an error message if something went wrong.

## Functionality

As previously stated, Ulquiorra is meant to replace multiple bots, therefore it has a wide range of features. Here are some of them:

### Moderation

Ulquiorra is equipped with powerful moderation commands and a mod level system which ranks moderators into "base" mods, from level 1 to 3, head mods, admins and owners. It also has its own automod called Reishi, which detects profanity, spam, links, and more.

List of moderation commands:
- `/warn <user> <reason>` - Warns a user.
- `/mute <user> <time> <reason>` - Mutes a user.

### Fun

### Utility

### Economy

## TO BE CONTINUTED