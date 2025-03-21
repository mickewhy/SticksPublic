//heroku logs --app poopydiaperheads
//
require('dotenv').config()
const Discord = require('discord.js')
const mongoose = require('mongoose')
const fetch = require("node-fetch")
const { Client, GatewayIntentBits, Partials, ActivityType, ChannelType, ModalBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, SelectMenuBuilder, TextInputStyle, InteractionType, PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js')
const client = new Client({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
})

const friends = require('./models/friendSchema')
const profiles = require('./models/profileSchema')
const dailies = require('./models/dailySchema')
const banners = require('./models/bannerSchema')
const anons = require('./models/anonymousSchema')
const timers = require('./models/timerSchema')
const serverVars = require('./models/serverVarsSchema')

const guildId = "576110255034073128"
var currentFriend = '.'
var currentHint = '.'
var lastChannelTime = '.'

function similarity(s1, s2) {
  var longer = s1
  var shorter = s2
  if (s1.length < s2.length) {
    longer = s2
    shorter = s1
  }
  var longerLength = longer.length
  if (longerLength == 0) {
    return 1.0
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase()
  s2 = s2.toLowerCase()

  var costs = new Array()
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j
      else {
        if (j > 0) {
          var newValue = costs[j - 1]
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

function sendGame(c) {
  friends.count().exec(function (err, count) {
    var random = Math.floor(Math.random() * count)
    friends.findOne().skip(random).exec(
      function (err, result) {
        c.send({
          embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "image": { "url": result.link }, "color": 2133068, footer: { text: "Type 'skip' to skip this friend" } }]
        }).then(() => {
          currentFriend = result.name
          currentHint = '-'.repeat(currentFriend.length)
          let filter = m => !m.author.bot && ((result.name.toLowerCase().includes(m.content.toLowerCase()) && similarity(m.content.toLowerCase(), result.name.toLowerCase()) >= 0.15) || similarity(m.content.toLowerCase(), result.name.toLowerCase()) >= 0.7 || m.content.toLowerCase() == "skip")
          c.awaitMessages({ filter, max: 1, time: '60000', errors: ['time'] }).then(collected => {
            if (collected.first().content.toLowerCase() == "skip")
              return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**Skipped! The correct answer was " + result.name + "** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(sendGame(c))
            if (collected.first().content.toLowerCase() == result.name.toLowerCase())
              return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**" + collected.first().member.displayName + " guessed the answer!**\n + double points for guessing the exact name!\n The correct answer was " + result.name + ".\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(addPoint(collected.first().author.id, 2))
            return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**" + collected.first().member.displayName + " guessed the answer!**\n The correct answer was " + result.name + ".\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(addPoint(collected.first().author.id, 1))
          }).catch(collected => {
            return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**Timed out! The correct answer was " + result.name + "** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] })
          })
        })
      })
  })
}

async function addPoint(id, amount) {
  let search = await profiles.findOne({ userID: id })
  if (search == null) {
    const profile = new profiles({
      userID: id,
      acorns: parseInt(amount)
    })

    await profile.save()
  }
  else
    await profiles.findOneAndUpdate({ userID: id }, { $set: { acorns: parseInt(search.acorns) + parseInt(amount) } }).catch((err) => {
      console.log(err)
    })
}

function shuffleBanner() {
  banners.count().exec(function (err, count) {
    var random = Math.floor(Math.random() * count)
    banners.findOne().skip(random).exec(
      function (err, result) {
        client.guilds.cache.get('576110255034073128').setBanner(result.link)
      })
  })
}

function generatePassword(length) {
  var result = ''
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++)
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  return result
}

async function reddit() {
  let body = null
  await fetch(`https://reddit.com/r/goblincore.json?sort=top&t=day`).then(res => res.json()).then(b => { body = b })
  let found = body.data.children
  if (!found.length) return
  found = found.filter(p => !p.data.distinguished)
  found = found.filter(p => !p.data.is_video)
  found = found.filter(p => !p.data.is_gallery)
  found = found.filter(p => p.data.url.slice(0, 9) == 'https://i')
  //let randInt = Math.floor(Math.random() * found.length)
  max = 0
  for (i in found) if (found[i].data.ups > found[max].data.ups) max = i
  let lastPermalink = await serverVars.findOne({ name: 'lastPermalink' })
  if (lastPermalink != null) {
    if (lastPermalink.value != found[max].data.permalink) {
      client.channels.cache.get('981937433862078534').send({
        embeds: [{ "description": "[Original Post](https://www.reddit.com" + found[max].data.permalink + ")", "title": found[max].data.title, "image": { "url": found[max].data.url }, "color": 16729344, "author": { "name": "u/" + found[max].data.author }, "footer": { "iconURL": "https://styles.redditmedia.com/t5_rd0hj/styles/communityIcon_8c7qf6sfu5p81.jpeg?width=256&format=pjpg&s=48cccb2be739cc6188d5c61366c3a00b747189d2", "text": "r/goblincore • " + found[max].data.ups + " upvotes • " + found[max].data.link_flair_text } }]
      })
      await serverVars.findOneAndUpdate({ name: 'lastPermalink' }, { value: found[max].data.permalink })
    }
    else throw 'Top post has already been posted'
  }
  else {
    const lastPermalink = new serverVars({
      name: 'lastPermalink',
      value: found[max].data.permalink,
    })
    await lastPermalink.save()
    client.channels.cache.get('981937433862078534').send({
      embeds: [{ "description": "[Original Post](https://www.reddit.com" + found[max].data.permalink + ")", "title": found[max].data.title, "image": { "url": found[max].data.url }, "color": 16729344, "author": { "name": "u/" + found[max].data.author }, "footer": { "iconURL": "https://styles.redditmedia.com/t5_rd0hj/styles/communityIcon_8c7qf6sfu5p81.jpeg?width=256&format=pjpg&s=48cccb2be739cc6188d5c61366c3a00b747189d2", "text": "r/goblincore • " + found[max].data.ups + " upvotes • " + found[max].data.link_flair_text } }]
    })
  }
}

client.on('ready', async () => {
  await mongoose.connect(process.env.srv).then(() => {
    console.log('Connected to Mongoose!')
  }).catch((err) => { console.log(err) })
  console.log(`${client.user.tag} is running!`)
  client.user.setPresence({ activities: [{ type: ActivityType.Playing, name: 'with sticks' }], status: 'online' })

  // let timer = await timers.findOne({ hours: 24 })
  // if (timer != null)
  //   if (Date.now() > timer.unix) {
  //     try { reddit() }
  //     catch (error) { console.log(error) }
  //     shuffleBanner()
  //     await timers.findOneAndUpdate({ hours: 24 }, { unix: Date.now() + (24 * 60 * 60 * 1000) })
  //   }
  //   else setTimeout(function () {
  //     try { reddit() }
  //     catch (error) { console.log(error) }
  //     shuffleBanner()
  //   }, parseInt(timer.unix - Date.now())) // ends after reaching giveaway.unix
  // else {
  //   const timeInstance = new timers({
  //     unix: Date.now() + (24 * 60 * 60 * 1000),
  //     hours: 24,
  //   })
  //   await timeInstance.save()
  //   try { reddit() }
  //   catch (error) { console.log(error) }
  //   shuffleBanner()
  // }

  // const guild = client.guilds.cache.get(guildId)
  // let commands
  // if (guild) commands = guild.commands
  // else commands = client.application.commands
  // client.application.commands.set([])
  // guild.commands.set([])

  // PUBLIC COMMANDS
  client.application.commands.create({
    name: 'help',
    description: `Replies with Sticks' command list.`,
  })
  client.application.commands.create({
    name: 'leaderboard',
    description: 'See the list of members with the most acorns.'
  })
  client.application.commands.create({
    name: 'friendgame',
    description: 'Play the Friend ID Game.'
  })
  client.application.commands.create({
    name: 'hint',
    description: 'Reveal 1 letter in the Friend ID Game.'
  })
  client.application.commands.create({
    name: 'bal',
    description: 'See how many acorns you have or another player has.',
    options: [
      {
        name: 'user',
        description: 'User whose bal you want to check.',
        required: false,
        type: 6
      }
    ]
  })
  client.application.commands.create({
    name: 'gift',
    description: 'Gift `<num>` acorns to `<user>`.',
    options: [
      {
        name: 'num',
        description: 'Amount of acorns to gift.',
        required: true,
        type: 10
      }, {
        name: 'user',
        description: 'User to gift.',
        required: true,
        type: 6
      }
    ]
  })
  client.application.commands.create({
    name: 'daily',
    description: 'Claim a daily reward of 10 acorns.'
  })
  client.application.commands.create({
    name: 'suggestion',
    description: 'Submit a suggestion.'
  })
  client.application.commands.create({
    name: 'friendform',
    description: 'Submit a friend for the Friend ID Game.'
  })
  client.application.commands.create({
    name: 'bannerform',
    description: 'Submit a banner.'
  })
  client.application.commands.create({
    name: 'invitecc',
    description: "Get an invite to the partnered server 'Creative Circle'."
  })
  client.application.commands.create({
    name: 'invitetc',
    description: "Get an invite to the partnered server 'the cottage'."
  })
  client.application.commands.create({
    name: 'changestim',
    description: "Change the stim channel's name.",
    options: [
      {
        name: 'name',
        description: 'New name.',
        required: true,
        type: 3
      }
    ]
  })

  // STAFF COMMANDS
  client.application.commands.create({
    name: 'staffhelp',
    description: `Replies with Sticks' staff command list.`,
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'add',
    description: 'Give `<num>` acorns to `<user>`.',
    options: [
      {
        name: 'num',
        description: 'Amount of acorns to give.',
        required: true,
        type: 10
      }, {
        name: 'user',
        description: 'User to give acorns to.',
        required: true,
        type: 6
      }
    ],
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'remove',
    description: 'Remove `<num>` acorns from `<user>`.',
    options: [
      {
        name: 'num',
        description: 'Amount of acorns to remove.',
        required: true,
        type: 10
      }, {
        name: 'user',
        description: 'User to remove acorns from.',
        required: true,
        type: 6
      }
    ],
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'addfriend',
    description: 'Adds a picture of `<name>` to the Friend ID Game from picture link `<link>`.',
    options: [
      {
        name: 'name',
        description: 'Name of the friend.',
        required: true,
        type: 3
      }, {
        name: 'link',
        description: 'Link to the friend picture.',
        required: true,
        type: 3
      }
    ],
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'addbanner',
    description: 'Adds a picture from picture link `<link>` to the banner rotation.',
    options: [
      {
        name: 'link',
        description: 'Link to the banner picture.',
        required: true,
        type: 3
      }
    ],
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'shufflebanner',
    description: 'Manually shuffles the server banner.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'reddit',
    description: 'Manually sends a reddit post from the goblincore subreddit.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
  client.application.commands.create({
    name: 'echo',
    description: 'Deletes the command and repeats `<message>`.',
    options: [
      {
        name: 'message',
        description: 'Message to repeat.',
        required: true,
        type: 3
      }
    ],
    defaultMemberPermissions: PermissionFlagsBits.KickMembers
  })
})

client.on('messageCreate', async message => {
  if (message.guild == null && !message.author.bot && message.content != ('1' || '2' || '3' || '4' || '5' || '6')) {
    if (message.content.length === 0) return message.reply("Message failed, please try again.")
    let anon = await anons.findOne({ userID: message.author.id })
    token = ''
    channelID = -1
    if (anon == null) {
      checker = false
      password = ""
      while (!checker) {
        password = generatePassword(10)
        if (await anons.findOne({ token: password }) == null) checker = true
      }
      const newAnon = new anons({
        userID: message.author.id,
        token: password
      })
      await newAnon.save()
      token = password
    } else token = anon.token
    message.reply({
      embeds: [{ "title": "<:dot:929477740887953488> Anonymous Submissions", "description": 'Type the number corresponding to the channel you want to send your submission to:\n> 1: i-need-advice-zone-🙋🏻\n> 2: questions-suggestions-feedback\n> 3: goblin-pride-🌈\n> 4: tw-screamy-linguine-vent-😡\n> 5: ❓-lets-educate-about-s-e-x\n> 6: anon-zone-🕵🏻', "image": { "url": 'https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png' }, "color": 2133068 }]
    }).then(() => {
      let filter = m => !m.author.bot && !m.content.isNaN && (parseInt(m.content) == 1 || parseInt(m.content) == 2 || parseInt(m.content) == 3 || parseInt(m.content) == 4 || parseInt(m.content) == 5 || parseInt(m.content) == 6)
      message.channel.awaitMessages({ filter, max: 1, time: '60000', errors: ['time'] }).then(collected => {
        if (parseInt(collected.first().content) == 1)
          channelID = '893320941923352576'
        if (parseInt(collected.first().content) == 2)
          channelID = '584173727772835850'
        if (parseInt(collected.first().content) == 3)
          channelID = '737539929994952744'
        if (parseInt(collected.first().content) == 4)
          channelID = '738588805447155824'
        if (parseInt(collected.first().content) == 5)
          channelID = '892432574197137418'
        if (parseInt(collected.first().content) == 6)
          channelID = '910298812894023770'
        client.channels.cache.get('910296120511582209').send({ embeds: [{ "title": "<:dot:929477740887953488> Anonymous Submissions", "description": "**User Token:** " + token + "\n**Channel:** <#" + channelID + ">\n\n**Message: **\n" + message.content, "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(m => {
          m.react('✅')
        })
        return collected.first().reply({ embeds: [{ "title": "<:dot:929477740887953488> Anonymous Submissions", "description": "Your message was anonymously sent to the server staff and is pending approval.", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] })
      }).catch(collected => {
        return message.channel.send({ embeds: [{ "title": "<:dot:929477740887953488> Anonymous Submissions", "description": "Request timed out.", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] })
      })
    })
  }

  if (message.content.toLowerCase().includes('<@981567074189058080>') && (message.content.toLowerCase().includes('hi') || message.content.toLowerCase().includes('hey') || message.content.toLowerCase().includes('hello') || message.content.toLowerCase().includes('gobmorning') || message.content.toLowerCase().includes('henlo'))) {
    arr = ['henlo', 'gobmorning', 'hello', 'hey', 'hi']
    message.channel.send(arr[Math.floor(Math.random() * arr.length)] + ' <@' + message.author.id + '>')
  }

  if (message.channel.id == '990430541369184286' && !message.author.bot) // VOTING
    message.react('<:gobthumbsup:990430256894705674>').then(message.react('<:gobthumbsdown:990430263265853512>'))

  // if (message.content.toLowerCase().startsWith('gob ') && !message.author.bot) {
  //   const args = message.content.slice('gob '.length).split(/ +/)
  //   const command = args.shift().toLowerCase()

  //   if (command === 'asgoblins') {
  //     message.channel.send({
  //       embeds: [{ "title": "<:dot:929477740887953488> AS Info", "description": "> **Chapter 1**\nOur Stance\nType `/ASch1`\n\n> **Chapter 2:**\nProblematic Imagery\nType `/ASch2`\n\n> **Chapter 3**\nweewoo\nType `/ASch3`", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
  //     })
  //   }

  //   if (command === 'asch1') {
  //     message.channel.send({
  //       embeds: [{ "title": "<:dot:929477740887953488> Our Stance", "description": "> **Chapter 1**\ntext text text", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
  //     })
  //   }

  //   if (command === 'asch2') {
  //     message.channel.send({
  //       embeds: [{ "title": "<:dot:929477740887953488> Our Stance", "description": "> **Chapter 2**\nmore text", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
  //     })
  //   }

  //   if (command === 'asch3') {
  //     message.channel.send({
  //       embeds: [{ "title": "<:dot:929477740887953488> Our Stance", "description": "> **Chapter 3**\nwee", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
  //     })
  //   }

  // }
})

client.on('interactionCreate', async interaction => {
  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === 'suggestionModal') {
      interaction.reply({
        embeds: [{ "description": "Suggestion received and is pending staff approval, thank you!", "color": 2133068 }],
        ephemeral: true
      })
      try {
        await client.channels.cache.get('910296120511582209').send({
          embeds: [{
            "title": "<:dot:929477740887953488> New Suggestion",
            "fields": [
              { "name": "Title", "value": interaction.fields.getTextInputValue('suggestionTitle') },
              { "name": "Category", "value": interaction.fields.getTextInputValue('suggestionCategory') },
              { "name": "Explanation", "value": interaction.fields.getTextInputValue('suggestionExplanation') },
              { "name": "Suggestion By", "value": "<@" + interaction.user.id + ">" },
            ], "footer": { "text": "React with ✅ to post this suggestion in the forums." }, "color": 2133068
          }]
        }).then(async m => {
          await m.react('✅')
        })
      }
      catch (err) { console.log(err) }
    }
    else if (interaction.customId === 'friendModal') {
      let string = interaction.fields.getTextInputValue('friendFormLink')
      if (!(string.endsWith(".jpg") || string.endsWith(".jpeg") || string.endsWith(".png")))
        return interaction.reply({
          embeds: [{ "description": "Please submit a link that ends in .jpg/.jpeg/.png!", "color": 2133068 }],
          ephemeral: true
        })
      interaction.reply({
        embeds: [{ "description": "Submission received, thank you!", "color": 2133068 }],
        ephemeral: true
      })
      try {
        await client.channels.cache.get('910296120511582209').send({
          embeds: [{ "title": interaction.fields.getTextInputValue('friendFormName'), "image": { "url": interaction.fields.getTextInputValue('friendFormLink') }, "footer": { "text": "React with ✅ to save this friend." }, "color": 2133068 }]
        }).then(async m => {
          await m.react('✅')
        })
      }
      catch (err) { console.log(err) }
    }
    else if (interaction.customId === 'bannerModal') {
      let string = interaction.fields.getTextInputValue('bannerFormLink')
      if (!(string.endsWith(".jpg") || string.endsWith(".jpeg") || string.endsWith(".png")))
        return interaction.reply({
          embeds: [{ "description": "Please submit a link that ends in .jpg/.jpeg/.png!", "color": 2133068 }],
          ephemeral: true
        })
      interaction.reply({
        embeds: [{ "description": "Submission received, thank you!", "color": 2133068 }],
        ephemeral: true
      })
      try {
        await client.channels.cache.get('910296120511582209').send({
          embeds: [{ "title": "New Banner Submission", "image": { "url": interaction.fields.getTextInputValue('bannerFormLink') }, "footer": { "text": "React with ✅ to save this banner." }, "color": 2133068 }]
        }).then(async m => {
          await m.react('✅')
        })
      }
      catch (err) { console.log(err) }
    }
  }
  else if (interaction.isCommand()) {
    const { commandName, options } = interaction
    // PUBLIC COMMANDS
    if (commandName === 'help') {
      embed = { "title": "<:dot:929477740887953488> Commands", "description": "> `/help`: Command list.\n\n> `/leaderboard`: See the list of members with the most acorns.\n\n> `/friendgame`: Play the Friend ID Game.\n\n> `/hint`: Reveal 1 letter in the Friend ID Game.\n\n> `/bal <optional: @player>`: See how many acorns you have or another player has.\n\n> `/gift <num> <user>`: Gift `<num>` acorns to `<user>`.\n\n> `/daily`: Claim a daily reward of 10 acorns.\n\n> `/suggestion`: Submit a suggestion.\n\n> `/friendform`: Submit a friend for the Friend ID Game\n\n> `/bannerform`: Submit a banner.\n\n> `/invitecc`: Get an invite to the partnered server 'Creative Circle'.\n\n> `/invitetc`: Get an invite to the partnered server 'the cottage'.", "color": 2133068, "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" } }
      interaction.reply({
        embeds: [embed]
      })
    }
    else if (commandName === 'leaderboard') {
      const sortedCollection = await profiles.find().sort({ acorns: -1 }).catch(e => console.log(e))
      leaderboard = ""
      added = 0
      for (var i in sortedCollection)
        if (added < 20) {
          leaderboard += "> <@" + sortedCollection[i].userID + ">: " + sortedCollection[i].acorns + " acorns \n"
          added++
        }
      interaction.reply({
        embeds: [{ "title": "<:acorn:981594825486925894> Leaderboard", "description": leaderboard + "\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
      })
    }
    else if (commandName === 'friendgame') {
      let c = interaction.channel
      friends.count().exec(function (err, count) {
        var random = Math.floor(Math.random() * count)
        friends.findOne().skip(random).exec(
          function (err, result) {
            interaction.reply({
              embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "image": { "url": result.link }, "color": 2133068, footer: { text: "Type 'skip' to skip this friend" } }]
            }).then(() => {
              currentFriend = result.name
              currentHint = '-'.repeat(currentFriend.length)
              let filter = m => !m.author.bot && ((result.name.toLowerCase().includes(m.content.toLowerCase()) && similarity(m.content.toLowerCase(), result.name.toLowerCase()) >= 0.15) || similarity(m.content.toLowerCase(), result.name.toLowerCase()) >= 0.7 || m.content.toLowerCase() == "skip")
              c.awaitMessages({ filter, max: 1, time: '60000', errors: ['time'] }).then(collected => {
                if (collected.first().content.toLowerCase() == "skip")
                  return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**Skipped! The correct answer was " + result.name + "** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(sendGame(c))
                if (collected.first().content.toLowerCase() == result.name.toLowerCase())
                  return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**" + collected.first().member.displayName + " guessed the answer!**\n + double points for guessing the exact name!\n The correct answer was " + result.name + ".\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(addPoint(collected.first().author.id, 2))
                return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**" + collected.first().member.displayName + " guessed the answer!**\n The correct answer was " + result.name + ".\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }).then(addPoint(collected.first().author.id, 1))
              }).catch(collected => {
                return c.send({ embeds: [{ "title": "<:acorn:981594825486925894> Friend Identification Game", "description": "**Timed out! The correct answer was " + result.name + "** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] })
              })
            })
          })
      })
    }
    else if (commandName === 'hint') {
      placeholder = currentHint
      while (currentHint == placeholder) {
        let out = []
        let i = 0
        for (i = 0; i < currentHint.length; i++) if (currentHint[i] === '-') out += i
        randAsterisk = parseInt(out[Math.floor(Math.random() * out.length)])
        currentHint = currentHint.substring(0, randAsterisk) + currentFriend.charAt(randAsterisk) + currentHint.substring(randAsterisk + currentFriend.charAt(randAsterisk).length)
      }
      interaction.reply({ content: currentHint })
    }
    else if (commandName === 'bal') {
      let user = options.getUser('user')
      if (!user) user = interaction.user
      amount = 0
      let search = await profiles.findOne({ userID: user.id })
      if (search == null)
        amount = 0
      else
        amount = search.acorns
      interaction.reply({ embeds: [{ "title": "<:acorn:981594825486925894> Acorns", "description": "**<@!" + user.id + "> has " + amount + " acorns.** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] })
    }
    else if (commandName === 'gift') {
      let num = options.getNumber('num')
      let user = options.getUser('user')
      let search = await profiles.findOne({ userID: interaction.user.id })
      if (search && num > 0 && search.acorns >= num) {
        addPoint(user.id, num)
        addPoint(interaction.user.id, -num)
        interaction.reply({
          embeds: [{ "title": "<:acorn:981594825486925894> Acorns", "description": "**Gifted " + num + " acorns to <@!" + user.id + ">** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
        })
      }
      else interaction.reply({
        embeds: [{ "description": "You don't have enough acorns!", "color": 2133068 }]
      })
    }
    else if (commandName === 'daily') {
      let search = await dailies.findOne({ userID: interaction.user.id })
      if (!search) {
        const daily = new dailies({
          userID: interaction.user.id,
          unix: Date.now()
        })
        await daily.save().then(addPoint(interaction.user.id, 10))
        interaction.reply({
          embeds: [{ "title": "<:acorn:981594825486925894> Daily Reward", "description": "> Gave +10 Acorns to **" + interaction.user.username + "**\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
        })
      }
      else
        if (Date.now() - search.unix >= 24 * 60 * 60 * 1000) {
          await dailies.findOneAndUpdate({ userID: interaction.user.id }, { $set: { unix: Date.now() } }).then(addPoint(interaction.user.id, 10)).catch((err) => { console.log(err) })
          interaction.reply({
            embeds: [{ "title": "<:acorn:981594825486925894> Daily Reward", "description": "> Gave +10 Acorns to **" + interaction.user.username + "**\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
          })
        }
        else
          interaction.reply({
            embeds: [{ "title": "<:acorn:981594825486925894> Daily Reward", "description": "24 hours haven't passed yet! You can run `/daily` again <t:" + parseInt((search.unix + 24 * 60 * 60 * 1000 + '').slice(0, -3)) + ":R>\n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
          })
    }
    else if (commandName === 'suggestion') {
      const modal = new ModalBuilder().setTitle('Suggestion Form').setCustomId('suggestionModal').setComponents(
        new ActionRowBuilder()
          .setComponents(
            new TextInputBuilder()
              .setLabel('Suggestion Title')
              .setPlaceholder('Enter a title for your suggestion')
              .setCustomId('suggestionTitle')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)),
        new ActionRowBuilder()
          .setComponents(new TextInputBuilder()
            .setLabel('Suggestion Category')
            .setPlaceholder('Channels, Category, Rules, etc.')
            .setCustomId('suggestionCategory')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)),
        new ActionRowBuilder()
          .setComponents(new TextInputBuilder()
            .setLabel('Suggestion Explanation')
            .setPlaceholder('Explain your suggestion and give reasoning if necessary')
            .setCustomId('suggestionExplanation')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true))
      )
      interaction.showModal(modal)
    }
    else if (commandName === 'friendform') {
      const modal = new ModalBuilder().setTitle('Friend ID Game Form').setCustomId('friendModal').setComponents(
        new ActionRowBuilder()
          .setComponents(
            new TextInputBuilder()
              .setLabel('Friend Name')
              .setPlaceholder('Example: Horse')
              .setCustomId('friendFormName')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)),
        new ActionRowBuilder()
          .setComponents(new TextInputBuilder()
            .setLabel('Friend Link')
            .setPlaceholder(`Make sure your link ends with a file extension like '.jpg'`)
            .setCustomId('friendFormLink')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true))
      )
      interaction.showModal(modal)
    }
    else if (commandName === 'bannerform') {
      const modal = new ModalBuilder().setTitle('Banner Form').setCustomId('bannerModal').setComponents(
        new ActionRowBuilder()
          .setComponents(new TextInputBuilder()
            .setLabel('Banner Link')
            .setPlaceholder(`Make sure your link ends with a file extension like '.jpg'`)
            .setCustomId('bannerFormLink')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true))
      )
      interaction.showModal(modal)
    }
    else if (commandName === 'invitecc') {
      interaction.reply('https://discord.gg/4JRpBZQgG5')
    }
    else if (commandName === 'invitetc') {
      interaction.reply('https://discord.gg/x8bUZGD6Ve')
    }
    else if (commandName === 'changestim') {
      if (lastChannelTime == '.' || (lastChannelTime != '.' && Date.now() - lastChannelTime >= 24 * 60 * 60 * 1000)) {
        let name = options.getString('name')
        try {
          interaction.guild.channels.cache.get('1133338431544631316').setName(name)
          lastChannelTime = Date.now()
        }
        catch (err) {
          return interaction.reply({ embeds: [{ "description": "Error detected, please try again with a different name!", "color": 2133068 }], ephemeral: true }) 
        }
        interaction.reply({ embeds: [{ "description": "Channel name set to **" + name + "**!", "color": 2133068 }] })
      }
      else {
        return interaction.reply({ embeds: [{ "description": "24 hours haven't passed yet! Try again <t:" + parseInt((lastChannelTime + 24 * 60 * 60 * 1000 + '').slice(0, -3)) + ":R>", "color": 2133068 }], ephemeral: true })
      }
    }

    // STAFF COMMANDS
    else if (commandName === 'staffhelp') {
      embed = { "title": "<:dot:929477740887953488> Commands", "description": "> `/staffhelp`: Staff only command list.\n\n> `/add <num> <user>`: Give `<num>` acorns to `<user>`.\n\n> `/remove <num> <user>`: Remove `<num>` acorns from `<user>`.\n\n> `/addfriend <link> <name>`: Adds a picture of `<name>` to Friend ID Game from picture link `<link>`.\n\n> `/addbanner <link>`: Adds a picture from picture link `<link>` to the banner rotation.\n\n> `/shufflebanner`: Manually shuffles the server banner.\n\n > `/reddit`: Manually sends a reddit post from the goblincore subreddit.\n\n > `/echo`: Deletes the command and repeats `<message>`", "color": 2133068, "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" } }
      interaction.reply({ embeds: [embed] })
    }
    else if (commandName === 'add') {
      let num = options.getNumber('num')
      let user = options.getUser('user')
      addPoint(user.id, num)
      interaction.reply({
        embeds: [{ "title": "<:acorn:981594825486925894> Acorns", "description": "**Gave " + num + " acorns to <@" + user + ">** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
      })
    }
    else if (commandName === 'remove') {
      let num = options.getNumber('num')
      let user = options.getUser('user')
      addPoint(user.id, -num)
      interaction.reply({
        embeds: [{ "title": "<:acorn:981594825486925894> Acorns", "description": "**Removed " + num + " acorns from <@" + user + ">** \n\n*Type `/help` for more commands*", "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }]
      })
    }
    else if (commandName === 'addfriend') {
      let name = options.getString('name')
      let link = options.getString('link')
      const friend = new friends({
        link: link,
        name: name
      })
      await friend.save().then(interaction.reply({
        embeds: [{ "description": "Friend saved in database!", "color": 2133068 }]
      }))
    }
    else if (commandName === 'addbanner') {
      let link = options.getString('link')
      client.guilds.cache.get(guildId).setBanner(link)
      const banner = new banners({
        link: link
      })
      await banner.save().then(interaction.reply({
        embeds: [{ "description": "Banner saved in database!", "color": 2133068 }]
      }))
    }
    else if (commandName === 'shufflebanner') {
      shuffleBanner()
      interaction.reply({ embeds: [{ "description": "Done!", "color": 2133068 }], ephemeral: true })
    }
    else if (commandName === 'reddit') {
      try { reddit() }
      catch (error) { return interaction.reply({ embeds: [{ "description": error, "color": 2133068 }], ephemeral: true }) }
      interaction.reply({ embeds: [{ "description": "Sent!", "color": 2133068 }], ephemeral: true })
    }
    else if (commandName === 'echo') {
      let message = options.getString('message')
      interaction.reply({ embeds: [{ "description": "Sent!", "color": 2133068 }], ephemeral: true })
      interaction.channel.send(message)
    }
  }
})

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.message.partial) await reaction.message.fetch()
  if (reaction.partial) await reaction.fetch()
  if (user.bot || !reaction.message.guild) return

  if (reaction.message.channel.id == '910296120511582209' && reaction.emoji.name === '✅' && (reaction.message.guild.members.cache.get(user.id).permissions.has("ADMINISTRATOR") || reaction.message.guild.members.cache.get(user.id).roles.cache.some(r => r.name === "GobMods")))
    for (let embed of reaction.message.embeds) {
      if (embed.footer && embed.footer.text.includes('friend')) {
        const friend = new friends({
          link: embed.image.url,
          name: embed.title
        })
        try {
          await friend.save()
        }
        catch (e) { return reaction.message.reply({ embeds: [{ "title": 'This image is already in the database!', "color": 2133068 }] }) }
        return reaction.message.reply({ embeds: [{ "title": 'Friend saved in database!', "color": 2133068 }] })
      }
      else if (embed.footer && embed.footer.text.includes('banner')) {
        const banner = new banners({
          link: embed.image.url
        })
        try {
          await banner.save()
        }
        catch (e) { return reaction.message.reply({ embeds: [{ "title": 'This image is already in the database!', "color": 2133068 }] }) }
        return reaction.message.reply({ embeds: [{ "title": 'Banner saved in database!', "color": 2133068 }] })
      }
      else if (embed.footer && embed.footer.text.includes('suggestion')) {
        await client.channels.cache.get('1033377258032857098').threads.create({
          name: embed.fields[0].value,
          message: '**Suggestion by: ' + embed.fields[3].value + '**\n\n**Category:** ' + embed.fields[1].value + '\n\n**Explanation:** ' + embed.fields[2].value
        })
      }
      else if (embed.title && embed.title.includes('Anonymous Submissions')) {
        client.channels.cache.get(embed.description.slice(42, 60)).send(
          { embeds: [{ "description": "**[" + embed.description.slice(16, 26) + "]:**\n" + embed.description.slice(77, embed.description.length), "image": { "url": "https://cdn.discordapp.com/attachments/981568655030636644/981693048532639774/line.png" }, "color": 2133068 }] }
        )
      }
    }

  if (reaction.message.channel.id == '584173640384249856' && reaction.emoji.name === 'gobbed' && (reaction.message.guild.members.cache.get(user.id).roles.cache.some(role => role.name === 'Guidegob') || reaction.message.guild.members.cache.get(user.id).roles.cache.some(role => role.name === 'Gobtown Managers') || reaction.message.guild.members.cache.get(user.id).roles.cache.some(role => role.name === 'GobMods (all)') || reaction.message.guild.members.cache.get(user.id).roles.cache.some(role => role.name === 'UberGobMod') || reaction.message.guild.members.cache.get(user.id).roles.cache.some(role => role.name === 'Goblim Princes 👑  (Admins)'))) {
    await reaction.message.guild.members.cache.get(reaction.message.author.id).roles.add('584170701737426944')
  }
})

process.on('unhandledRejection', err => {
  console.log(err)
  client.channels.cache.get('981608811238404136').send({ content: err.stack })
})

client.login(process.env.token)