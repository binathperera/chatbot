let textToSpeech=false;
let assistant='Aria';
let mode='1';
let voiceStatusSpan=document.getElementById("voiceSpan");
let sound=document.getElementById("sound");
sound.addEventListener('change',function(){
    textToSpeech=this.checked;
    if(textToSpeech){
        voiceStatusSpan.innerHTML="Assistant voice ON&nbsp;&nbsp;";
    }else{
        voiceStatusSpan.innerHTML="Assistant voice OFF&nbsp;";
    }
});
let chatbox=document.getElementById("chatbox");
chatbox.addEventListener('keypress',function(event){
    if(event.key==='Enter'){
        ask(chatbox.text);
        chatbox.value="";
    }
});
let submitButton=document.getElementById("submitButton");
submitButton.addEventListener('click',function(){
    ask(chatbox.text);
    chatbox.value="";
});

let speechButton=document.getElementById("speechInputButton");
speechButton.addEventListener('click',function(){
    recognition.start();
});

const fetchHistorySettings = {
    headers: {
        'Accept': 'application/json',
    }, 
};
load();

var objDiv = document.getElementById("response");
async function load(){
    const fetchChatHistory = await fetch("/history", fetchHistorySettings);
    const chatHistory = await fetchChatHistory.json();
    console.log(chatHistory);
    for(let i=0;i<chatHistory.length-1;i++){
        console.log(chatHistory[i]);
        objDiv.innerHTML += "<b style='color:lightblue'>You&nbsp;</b> : "+ chatHistory[i].prompt+"<br><br>";
        objDiv.innerHTML += "<b style='color:lightgreen'>"+assistant+" </b>: "+ chatHistory[i].response+"<br><br>";
    }
    if(chatHistory[chatHistory.length-1].clear==true){
        window.alert("Please clear the chat");
        submitButton.hidden=true;
        chatbox.hidden=true;
        speechButton.hidden=true;
    }
}
let clearButton=document.getElementById("clearButton");
clearButton.addEventListener('click',function(){
    objDiv.innerHTML="";
    submitButton.hidden=false;
    chatbox.hidden=false;
    speechButton.hidden=false;
    sendDeleteCommand();
});
async function sendDeleteCommand(){
    const deleteSettings = {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };
    fetch("/delete", deleteSettings);
}
async function ask(){
    let prompt=document.getElementById('chatbox').value;
    let key=document.getElementById('key').value;
    data= {"prompt":prompt,"assistant":assistant,"key":key};
    objDiv.innerHTML += "<b style='color:lightblue'>You&nbsp;</b> : "+ prompt+"<br><br>";
    objDiv.scrollTop = objDiv.scrollHeight;
    const settings = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    try {
        const fetchResponse = await fetch("/", settings);
        const data = await fetchResponse.json();
        if(textToSpeech){
            say(data.message);
        }
        objDiv.innerHTML += "<b style='color:lightgreen'>"+assistant+" </b>: "+ data.message+"<br><br>";
        objDiv.scrollTop = objDiv.scrollHeight;
        if(data.clear){
            window.alert("Please clear the chat");
            submitButton.hidden=true;
            chatbox.hidden=true;
            speechButton.hidden=true;
        }     
    } catch (e) {
        return e;
    }
}
let msg = new SpeechSynthesisUtterance();
let voices = window.speechSynthesis.getVoices();
msg.voiceURI = "native";
msg.volume = 1;
msg.rate = 1;
msg.pitch = 0.8;
msg.lang = 'en-US';
function say(m) {
    voices = window.speechSynthesis.getVoices();
    switch(assistant){
        case 'Aria': msg.voice = voices[110]; break;
        case 'Eric': msg.voice = voices[113]; break;
        case 'Olivia': msg.voice = voices[108]; break;
        case 'Thomas': msg.voice = voices[109]; break;
        default: msg.voice = voices[110]; break;
    }
    msg.text = m;
    speechSynthesis.speak(msg);
    if(mode=='2'){msg.onend = () => recognition.start();}
    //for(var i=0;i<voices.length;i++){
    //    console.log(i);
    //    console.log(voices[i]);
    //}
}

try {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
}  
catch(e) {
    console.error(e);
    $('.no-browser-support').show();
    $('.app').hide();
}
recognition.onstart = function() {
    //instructions.text('Voice recognition activated. Try speaking into the microphone.');
    document.getElementById("listeningTag").hidden = false;
}
  
recognition.onspeechend = function() {
    // instructions.text('You were quiet for a while so voice recognition turned itself off.');
    document.getElementById("listeningTag").hidden = true;
}
  
recognition.onerror = function(event) {
    if(event.error == 'no-speech') {
      instructions.text('No speech was detected. Try again.');  
    };
}
recognition.onresult = function(event) {
    // event is a SpeechRecognitionEvent object.
    // It holds all the lines we have captured so far. 
    // We only need the current one.
    var current = event.resultIndex;
  
    // Get a transcript of what was said.
    var transcript = event.results[current][0].transcript;
  
    // Add the current transcript to the contents of our Note.
    chatbox.value+=transcript;
    chatbox.focus();
    if(mode=='2'){
        ask(chatbox.text);
        chatbox.value="";
    }
}


let assistantSelector=document.getElementById("assistantSelector");
assistantSelector.addEventListener('change',function(event){
    assistant=assistantSelector.options[assistantSelector.selectedIndex].value;
});

let modeSelector=document.getElementById("modeSelector");
modeSelector.addEventListener('change',function(event){
    mode=modeSelector.options[modeSelector.selectedIndex].value;
    if(mode==2){
        textToSpeech=true;
        sound.checked=true;
        voiceStatusSpan.innerHTML="Assistant voice ON&nbsp;&nbsp;";
        sound.hidden=true;
    }else{
        sound.hidden=false;
    }
});
