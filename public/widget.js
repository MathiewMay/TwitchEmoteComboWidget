var currentEmote = "";
$(function () {
	var socket = io();
    socket.on('new combo', function(count, image, name, isFFZ){
	    if(currentEmote == name){
	    	document.getElementById("combo").innerHTML = "x"+count;
	    	document.getElementById("emote").className = "nil";
			setTimeout(emoteJump, 50);
	    }else{
	    	currentEmote = name;
	    	document.getElementById("combo").innerHTML = "x"+count;
		    if(isFFZ == true){
		        const URL = 'https://api.frankerfacez.com/v1/emote/'+image;
		        $.get(URL, function(data, status){
		            document.getElementById("emote").src = data.emote.urls[Object.keys(data.emote.urls).sort().pop()];
		        });
		    }else{
		    	document.getElementById("emote").src = image;
		    }
	  		document.getElementById("emote").className = "nil";
			document.getElementById("border").className = "container";
		    setTimeout(slideUp, 10);
	    }
    });
    socket.on('reset', function(){
    	document.getElementById("border").className = "container";
    	setTimeout(slideDown, 10);
    	setTimeout(clear, 200);
    });
});

function emoteJump(){
	document.getElementById("emote").className = "emote-anim";
}

function slideUp(){
	document.getElementById("border").className = "container_up";
}

function slideDown(){
	document.getElementById("border").className = "container_down";
}

function clear(){
	currentEmote = "";
  	document.getElementById("combo").innerHTML = "";
   	document.getElementById("emote").src = "/images/none.png"; 
}