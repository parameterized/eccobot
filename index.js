
const fs = require('fs');
const { Transform } = require('stream');
const Discord = require('discord.js');
const client = new Discord.Client()

const token = fs.readFileSync('./token.txt', 'utf8').trim();

var voiceConnections = new Map();
var voiceReceivers = new Map();
var userStreams = new Map();
var echoOn = false;
var testSoundOn = false;
var testStreamOn = false;

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
				echoOn = false;
				testSoundOn = false;
				testStreamOn = false;
			} else {
				message.member.voiceChannel.join().then((voiceConnection) => {
					voiceConnections.set(message.member.voiceChannelID, voiceConnection);
					voiceConnection.playFile('test/steam.mp3');
					voiceReceivers.set(message.member.voiceChannelID, voiceConnection.createReceiver());
				});
			}
		}
	} else if (cmd === '.echo') {
		echoOn = !echoOn;
	} else if (cmd === '.testfile') {
		let voiceConnection = message.guild.voiceConnection;
		if (voiceConnection) {
			testSoundOn = !testSoundOn;
			let restartOrEnd = (message) => {
				voiceConnection = voiceConnections.get(message.member.voiceChannelID);
				if (testSoundOn && voiceConnection && voiceConnection.status === 0) {
					voiceConnection.playFile('test/PowerUp.wav').once('end', () => {
						setTimeout(() => {
							restartOrEnd(message);
						}, 1000);
					});
				}
			};
			restartOrEnd(message)
		}
	} else if (cmd === '.testpy') {
		let voiceConnection = message.guild.voiceConnection;
		if (voiceConnection) {
			testStreamOn = !testStreamOn;
			if (testStreamOn) {
				let testStream = new Transform({
					transform(chunk, encoding, callback) {
						this.push(chunk);
						callback();
					}
				});
				let interval = setInterval(() => {
					if (testStream) {
						if (testStreamOn) {
							let buf = Buffer.alloc(24000*4);
							for (i=0; i < 24000; i++) {
								for (j=0; j < 2; j++) {
									buf.writeInt16LE(
										Math.floor(
											Math.sin(i/48000*6.2831*440)
											*0.2*16383+16383
										),
										i*4+j*2
									);
								}
							}
							testStream.write(buf);
						} else {
							testStream.end();
							clearInterval(interval);
						}
					}
				}, 500);
				voiceConnection.playConvertedStream(testStream);
			}
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
				userStream = voiceReceiver.createPCMStream(member);
				userStreams.set(member.id, userStream);
				if (echoOn) {
					setTimeout(() => {
						voiceReceiver.voiceConnection.playConvertedStream(userStream);
					}, 500);
				}
			}
		}
	}
}

client.on('guildMemberSpeaking', guildMemberSpeaking);

client.login(token);
