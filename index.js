
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client()

const token = fs.readFileSync('./token.txt', 'utf8').trim();

var voiceReceivers = new Map();
var writeStreams = new Map();
var echoTimes = new Map();

client.on('ready', () => {
	console.log('ready');
});

client.on('message', message => {
	let mention = client.user.id + '>';
	if (message.guild.me.nickname) {
		mention = '<@!' + mention;
	} else {
		mention = '<@' + mention;
	}
	if (!message.content.startsWith(mention)) {
		return;
	}
	let cmd = message.content.replace(mention + ' ', '');
	if (cmd === '.voice') {
		if (!message.member.voiceChannel) {
			message.channel.send('connect to a voice channel first');
		} else {
			let voiceConnection = message.guild.voiceConnection;
			if (voiceConnection && voiceConnection.channel.id === message.member.voiceChannelID) {
				voiceConnection.disconnect();
			} else {
				message.member.voiceChannel.join().then(voiceConnection => {
					voiceReceivers.set(message.member.voiceChannelID, voiceConnection.createReceiver());
				});
			}
		}
	} else if (cmd == '.echo') {
		let voiceConnection = message.guild.voiceConnection;
		if (!message.member.voiceChannel || !voiceConnection ||
		voiceConnection.channel.id !== message.member.voiceChannelID) {
			return;
		}
		let recName = `${message.member.voiceChannelID}-${Date.now()}`;
		fs.mkdirSync(`voice_streams/${recName}`);
		let echoTime = echoTimes.get(message.member.voiceChannelID);
		if (echoTime) {
			message.channel.send('already recording');
			return;
		}
		echoTimes.set(message.member.voiceChannelID, Date.now());
		let voiceReceiver = voiceReceivers.get(message.member.voiceChannelID);
		if (voiceReceiver) {
			voiceReceiver.on('opus', (user, data) => {
				let echoTime = echoTimes.get(voiceReceiver.voiceConnection.channel.id);
				if (!echoTime) {
					return;
				}
				let writeStream = writeStreams.get(user.id);
				if (Date.now() - echoTime > 3000) {
					echoTimes.delete(voiceReceiver.voiceConnection.channel.id);
					if (writeStream) {
						writeStream.end(err => {
							if (err) {
								console.error(err);
							}
						})
						writeStreams.delete(user.id);
					}
					return;
				}
				let hexString = data.toString('hex');
				if (!writeStream) {
					if (hexString === 'f8fffe') {
						return;
					}
					let outputPath = `voice_streams/${recName}/${user.id}-${Date.now()}.opus_string`;
					writeStream = fs.createWriteStream(outputPath);
					writeStreams.set(user.id, writeStream);
				}
				writeStream.write(`,${hexString}`);
			});
		} else {
			console.log('no voice receiver found');
		}
	}
});

function guildMemberSpeaking(member, speaking) {
	if (!speaking && member.voiceChannel) {
		let receiver = voiceReceivers.get(member.voiceChannelID);
		if (receiver) {
			let writeStream = writeStreams.get(member.id);
			if (writeStream) {
				writeStream.end(err => {
					if (err) {
						console.error(err);
					}
				});
				writeStreams.delete(member.id);
			}
		}
	}
}

/*
var updateInterval = setInterval(function() {
	writeStreams.forEach((writeStream, userID) => {

	});
}, 50);
*/

client.on('guildMemberSpeaking', guildMemberSpeaking);

client.login(token);
