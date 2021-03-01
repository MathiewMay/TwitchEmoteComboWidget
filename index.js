const express = require("express");
const axios = require('axios');
const tmi = require('tmi.js');
const emoji_parser = require('universal-emoji-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.argv[3];

var debug = false;

var combo = process.argv[4];
var ttv_username = process.argv[2];
var ttv_id = "";

let FFZEmotes = new Map();
let GlobalFFZEmotes = new Map();

let BTTVEmotes = new Map();
let GlobalBTTVEmotes = new Map();

var timeout_timer = -1;

app.get("/", (req, res) => {
	res.sendFile(__dirname+"/index.html");
})

app.use(express.static('public'))

http.listen(port, () => {
	console.log("Emote Combo Widget is now running on http://localhost:"+port);
})

getTID(); 
async function getTID(){ 
	try {
		const res = await axios.get("https://api.frankerfacez.com/v1/room/"+ttv_username); 
		ttv_id = res.data.room.twitch_id; 
		console.log("Found "+ttv_username+"'s TID: "+ttv_id); 
		generateFFZEmotes();
		console.log("Generated Emote Sets");
		setInterval(autoReload, 60*1000);
	} catch (error) {
		console.log("Could not find "+ttv_username+"'s TID, make sure that they are registered on FrankerFaceZ.");
	}
}

async function generateFFZEmotes(){
	const res = await axios.get("https://api.frankerfacez.com/v1/room/"+ttv_username);
	Object.keys(res.data.sets).forEach(function(key1) {
		Object.keys(res.data.sets[key1].emoticons).forEach(function(key2) {
			FFZEmotes.set(res.data.sets[key1].emoticons[key2].name, res.data.sets[key1].emoticons[key2].id);
		});
	});
	if(debug == true) { console.log(FFZEmotes); }
	generateGlobalFFZEmotes();
}

async function generateGlobalFFZEmotes(){
	const res = await axios.get("https://api.frankerfacez.com/v1/set/global");
	Object.keys(res.data.sets[3].emoticons).forEach(function(key) {
		GlobalFFZEmotes.set(res.data.sets[3].emoticons[key].name, res.data.sets[3].emoticons[key].id);
	});
	if(debug == true) { console.log(GlobalFFZEmotes); }
	generateBTTVEmotes();
}

async function generateBTTVEmotes(){
	try {
		const res = await axios.get("https://api.betterttv.net/3/cached/users/twitch/"+ttv_id);
		Object.keys(res.data.sharedEmotes).forEach(function(key) {
			BTTVEmotes.set(res.data.sharedEmotes[key].code, res.data.sharedEmotes[key].id);
		});
		if(debug == true) { console.log(BTTVEmotes); }
		generateGlobalBTTVEmotes();
	} catch (error) {
		console.log(ttv_username+" is not a BTTV User");
	}
}

async function generateGlobalBTTVEmotes(){
	const res = await axios.get("https://api.betterttv.net/3/cached/emotes/global");
	Object.keys(res.data).forEach(function(key) {
		GlobalBTTVEmotes.set(res.data[key].code, res.data[key].id);
	});
	if(debug == true) { console.log(GlobalBTTVEmotes); }
}

timeout();

const client = new tmi.Client({
	options: { debug: false, messagesLogLevel: "info" },
	connection: { reconnect: true, secure: true },
	identity: { username: 'justinfan'+Math.floor(Math.random() * Math.floor(99999)), password: '' },
	channels: [ ttv_username ]
});

var emoteCombo = 0;
var currentEmote = "";

client.connect().catch(console.error);
client.on('message', (channel, tags, message, self) => {
	if(self) return;
	var msg_wrt_lst = message.split(" ");

	if(message == "$$reloadccw"){
		if(tags.mod == true || tags.username == ttv_username){
			FFZEmotes.clear();
			GlobalFFZEmotes.clear();
			BTTVEmotes.clear();
			GlobalBTTVEmotes.clear();
			generateFFZEmotes();
			console.log(tags.username + " Sent Reload Command: Reloading Emote Sets");
		}
	}

	for(var i = 0; i < msg_wrt_lst.length; i++) {
		if(emoji_parser.parse(msg_wrt_lst[i]).includes('https://twemoji.maxcdn.com/v/')){
			generateCombo(msg_wrt_lst[i]);
			return;
		}
		if(FFZEmotes.has(msg_wrt_lst[i])){
			generateCombo(msg_wrt_lst[i]);
			return;
		}
		if(GlobalFFZEmotes.has(msg_wrt_lst[i])){
			generateCombo(msg_wrt_lst[i]);
			return;
		}
		if(BTTVEmotes.has(msg_wrt_lst[i])){
			generateCombo(msg_wrt_lst[i]);
			return;
		}
		if(GlobalBTTVEmotes.has(msg_wrt_lst[i])){
			generateCombo(msg_wrt_lst[i]);
			return;
		}
		if(tags.emotes != null){
			generateCombo("ttv#"+Object.keys(tags.emotes)[0]);
			return;
		}
	}

	if(emoteCombo > 0){
		emoteCombo = 0;
		currentEmote = "";
	}
});

function generateCombo(emote) {
	if(emoteCombo == 0 && currentEmote == ""){
		emoteCombo = emoteCombo + 1;
		currentEmote = emote;
	}else{
		if(currentEmote == emote){
			emoteCombo = emoteCombo + 1;
		}else{
			emoteCombo = 0;
			currentEmote = "";
			emoteCombo = emoteCombo + 1;
			currentEmote = emote;
		}
	}
	if(emoteCombo >= combo){
		var emoteLink = "";
		var isFFZ = false;
		if(emote.includes("ttv#")){
			emoteLink = "https://static-cdn.jtvnw.net/emoticons/v1/"+emote.replace("ttv#", "")+"/3.0";
			isFFZ = false;
		}else{
			if(FFZEmotes.has(emote)){
				emoteLink = FFZEmotes.get(emote);
				isFFZ = true;
			}
			if(GlobalFFZEmotes.has(emote)){
				emoteLink = GlobalFFZEmotes.get(emote);
				isFFZ = true;
			}
			if(BTTVEmotes.has(emote)){
				emoteLink = "https://cdn.betterttv.net/emote/"+BTTVEmotes.get(emote)+"/3x";
				isFFZ = false;
			}
			if(GlobalBTTVEmotes.has(emote)){
				emoteLink = "https://cdn.betterttv.net/emote/"+GlobalBTTVEmotes.get(emote)+"/3x";
				isFFZ = false;
			}
			if(emoji_parser.parse(emote).includes('https://twemoji.maxcdn.com/v/')){
				emoteLink = emoji_parser.parse(emote).split('"')[7];
				isFFZ = false;
			}
		}
		if(debug == true){
			var output = '<[( '+currentEmote+' x'+emoteCombo+' )]> ';
			console.log(output); 
		}
		sendCombo(currentEmote, emoteCombo, emoteLink, isFFZ);
		timeout_timer = 5;
	}
}

function sendCombo(emote_name, count, link, isFFZ) {
	io.emit('new combo', count, link, emote_name, isFFZ);
}

function autoReload(){
	FFZEmotes.clear();
	GlobalFFZEmotes.clear();
	BTTVEmotes.clear();
	GlobalBTTVEmotes.clear();
	generateFFZEmotes();
}

function timeout() {
    if(timeout_timer == -1) {
        setTimeout(timeout, 1000);
    }else if(timeout_timer == 0){
    	timeout_timer = -1;
    	io.emit('reset');
    	setTimeout(timeout, 1000);
    }else if(timeout_timer >= 1){
    	timeout_timer = timeout_timer - 1;
    	setTimeout(timeout, 1000);
    }else {
    	setTimeout(timeout, 1000);
    }
};