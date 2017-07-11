
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client()

const token = fs.readFileSync('./token.txt', 'utf8').trim();

var voiceConnections = new Map();
var voiceReceivers = new Map();
var userStreams = new Map();
var echo = false;
var testSound = false;

client.on('ready', () => {
	console.log('ready');
});

client.on('message', (message) => {
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
				voiceConnections.delete(message.member.voiceChannelID);
				echo = false;
				testSound = false;
			} else {
				message.member.voiceChannel.join().then((voiceConnection) => {
					voiceConnections.set(message.member.voiceChannelID, voiceConnection);
					voiceConnection.playFile('test/steam.mp3');
					voiceReceivers.set(message.member.voiceChannelID, voiceConnection.createReceiver());
				});
			}
		}
	} else if (cmd == '.echo') {
		echo = !echo;
	} else if (cmd == '.test') {
		let voiceConnection = message.guild.voiceConnection;
		if (voiceConnection) {
			testSound = !testSound;
			let restartOrEnd = (message) => {
				voiceConnection = voiceConnections.get(message.member.voiceChannelID);
				if (testSound && voiceConnection && voiceConnection.status === 0) {
					voiceConnection.playFile('test/PowerUp.wav').once('end', () => {
						setTimeout(() => {
							restartOrEnd(message);
						}, 15);
					});
				}
			};
			restartOrEnd(message)
		}
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
				//doesn't work well
				userStream = voiceReceiver.createOpusStream(member);
				userStreams.set(member.id, userStream);
				if (echo) {
					setTimeout(() => {
						voiceReceiver.voiceConnection.playOpusStream(userStream);
					}, 500);
				}
			}
		}
	}
}

client.on('guildMemberSpeaking', guildMemberSpeaking);

client.login(token);
