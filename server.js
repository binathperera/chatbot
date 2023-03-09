
const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const bodyParser = require('body-parser');
const fetch= require('node-fetch');
const fs = require("fs");
const cors= require('cors');
const csv = require("csv-parser");
const port=9000;

const app=express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const configuration = new Configuration({
    organization: "org-u6MOo3CKEN48sjobAb7wi5Ww",
    apiKey: "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",
});
const openai = new OpenAIApi(configuration);

let assistant;
let str1;
let context;

app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/public/index.html");
});
app.get('/script.js',(req,res)=>{
    res.sendFile(__dirname+"/public/script.js");
});
app.get('/styles.css',(req,res)=>{
    res.sendFile(__dirname+"/public/styles.css");
});
app.get('/microphone-logo-png.png',(req,res)=>{
    res.sendFile(__dirname+"/public/microphone-logo-png.png");
});
app.post('/',async (req,res)=>{
    res.writeHead(200,{"Content-Type":"application/json"});
    assistant=req.body.assistant;
    str1=`You are a friendly AI assistant named `+assistant+` built to help the customers of BLUE LOTUS 360. Carry out the conversation as truthfully as possible using the provided text, and if the answer is not contained within the text below, say I don't know.`
    res.write(JSON.stringify({
        //message: req.body.prompt
        message: await ask(req.body.prompt)
    }));
    res.end();
});
app.listen(port, ()=>{
    console.log(`http://localhost:${port}`);
});

let chat=[];
async function ask(p){
    context=`\nContext: `;
    let arr= await getEmbeddings(p);
    for(var element of arr){
        console.log(element);
        let s= await getContext(element);
        context+= s;
    }
    chat[0]= {"role":"system","content": str1+context};
    chat.push( {"role":"user", "content": p} );
    // Cost
    // text-babbage-001 0.0005  4x cheaper than gpt 3.5 turbo
    // gpt-3.5-turbo    0.002 10x cheaper than davinci
    // text-davinci-003 0.02
    let data= { 
        model: "gpt-3.5-turbo",
        messages: chat
    }
    const settings = {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    try {
        const fetchResponse = await fetch(`https://api.openai.com/v1/chat/completions`, settings);
        const obj = await fetchResponse.json();
        chat.push( {"role":"assistant", "content": obj.choices[0].message.content});
        return obj.choices[0].message.content;  
    } catch (e) {
        console.log(e);
        return "An error has occured";
    }
}

async function getEmbeddings(p){
    const e = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: p,
      });
    let questionEmbedding=JSON.parse((JSON.stringify(e.data))).data[0].embedding; // store an array of floats representing the embedding for the string
    let embeddings = [];
    const { finished } = require('stream');
    const { promisify } = require('util');
    const finishedAsync = promisify(finished);
    const readable=fs.createReadStream("embeddings.csv")
    .pipe(csv())
    .on("data", data => embeddings.push(Object.values(data)))
    .on("end", () => console.log("embeddings loaded"));
    await finishedAsync(readable);
    let results = [];
    for(let i=1;i<=embeddings.length;i++) {
        results.push([i,dotProduct(embeddings[i-1].slice(1,embeddings[i-1].length),questionEmbedding)]);
    };
    console.log("Before:"+ results);
    results = results.sort((a, b) => b[1] - a[1] ).slice(0,2);
    console.log("After:"+ results);
    return results;
}

async function getContext(element){
    const { finished } = require('stream');
    const { promisify } = require('util');
    const finishedAsync = promisify(finished);
    let context="";
    const readable=fs.createReadStream("data.csv")
    .pipe(csv())
    .on("data", data => { 
        if(Object.values(data)[0]==element[0])context="\n* "+Object.values(data)[1]+"-"+Object.values(data)[2]+"-"+Object.values(data)[3];
    })
    .on("end", () => console.log("context loaded"));
    await finishedAsync(readable);
    return context;
}

function dotProduct(a,b) {
    const result = a.reduce((acc, cur, index)=>{
        acc += (cur * b[index]);
        return acc;
      }, 0);
    return result;
}
// 1st training - "babbage:ft-personal-2023-02-28-08-37-45"