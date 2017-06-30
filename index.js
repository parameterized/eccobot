
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client()

const token = fs.readFileSync('./token.txt', 'utf8').trim();

var voiceReceivers = new Map();
var userStreams = new Map();
var echo = false;

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
				let voiceReceiver = voiceReceivers.get(message.member.voiceChannelID);
				if (voiceReceiver) {
					voiceReceiver.destroy();
					voiceReceivers.delete(message.member.voiceChannelID);
				}
				voiceConnection.disconnect();
			} else {
				message.member.voiceChannel.join().then(voiceConnection => {
					voiceReceivers.set(message.member.voiceChannelID, voiceConnection.createReceiver());

				});
			}
		}
	} else if (cmd == '.echo') {
		echo = !echo;
	}
});

function guildMemberSpeaking(member, speaking) {
	if (member.id !== client.user.id) {
		let voiceReceiver = voiceReceivers.get(member.voiceChannelID);
		if (voiceReceiver) {
			let userStream = userStreams.get(member.id);
			if (userStream) {
				userStream.destroy();
				userStreams.delete(member.id);
			}
			if (speaking) {
				userStream = voiceReceiver.createOpusStream(member);
				userStreams.set(member.id, userStream);
				if (echo) {
					voiceReceiver.voiceConnection.playOpusStream(userStream);
				}
			}
		}
	}
}

client.on('guildMemberSpeaking', guildMemberSpeaking);

client.login(token);
