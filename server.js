
const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const bodyParser = require('body-parser');
const fetch= require('node-fetch');
const fs = require("fs");
const cors= require('cors');
const csv = require("csv-parser");
const session = require("express-session");
const mysql = require("mysql");
const MySQLStore = require('express-mysql-session')(session);
const apphost='localhost';
const appServerPort=9000;
const dbhost='db-mysql-chatbot-do-user-13715267-0.b.db.ondigitalocean.com';
const dbport=25060;
const dbuser= 'doadmin';
const dbpassword='AVNS_4G-zvdIRp1L79lX2SV2';
const databaseName='defaultdb';

var options = {
	host: dbhost,
	port: dbport,
	user: dbuser,
	password: dbpassword,
	database: databaseName,   
    clearExpired: true,
    expiration: 1000*60*60*24,
    createDatabaseTable: true,
    schema: {
		tableName: 'sessions',
		columnNames: {
			session_id: 'session_id',
			expires: 'expires',
			data: 'data', 
		}
	}
};
var connection = mysql.createConnection({
    host     : dbhost,
    user     : dbuser,
    password : dbpassword,
    port: dbport,
    database : databaseName,
    
  });
connection.connect();
// var del = connection._protocol._delegateError;
// connection._protocol._delegateError = function(err, sequence){
//   if (err.fatal) {
//     console.trace('fatal error: ' + err.message);
//   }
//   return del.call(this, err, sequence);
// };

var sessionStore = new MySQLStore(options);

const app=express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(session({
	key: 'session_cookie',
	secret: 'session_cookie_secret',
	store: sessionStore,
	resave: false,
	saveUninitialized: true,
    cookie:{
        maxAge: 1000*60*60*24
    }
}));

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
app.get('/history',(req,res)=>{
    console.log(req.sessionID);
    let q= "Select * from messages where session_id='"+req.sessionID+"' order by sequence_no";
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           data.push({"clear": isDelete(req.sessionID)});
           res.json(data);
        }
    })
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
    str1=`You are a friendly AI assistant named `+assistant+` built to help the customers of BLUE LOTUS 360. Answer as truthfully as possible using the provided text, and if the answer is not contained within the text below, say I don't know.`    
    res.write(JSON.stringify({
        //message: req.body.prompt
        message: await ask(req.body.prompt,req.sessionID),
        clear: await isDelete(req.sessionID)
    }));
    
    res.end();
});
app.get('/delete',async (req,res)=>{
    deleteMessages(req.sessionID);
});
app.listen(appServerPort, ()=>{
    console.log(`http://${apphost}:${appServerPort}`);
});
function isDelete(session_id){
    let q= "Select tokens from sessions where session_id='"+session_id+"'";
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
            if(data[0]!=undefined){
                return data[0].tokens>2000;
            }
            return false;
        }
    })
    return false;
}

function parse(str){
    return str.replaceAll("'","''");
}
function queryPromise(str) { 
    return new Promise((resolve, reject) => {
      connection.query(str, (err, result, fields) => {
        if (err){
            console.log(error);
            reject(err); 
        }
        resolve(result);
      })
    })
  }
async function ask(p,session_id){
    if(isDelete(session_id)){
        return "Please clear the chat history";
    }
    context=`\nContext: `;
    let arr= await getEmbeddings(p);
    for(var element of arr){
        console.log(element);
        let s= await getContext(element);
        context+= s;
    }
    let sequence_no;
    let q= "Select * from messages where session_id='"+session_id+"' order by sequence_no";
    let chat=new Array();
    chat.push({"role":"system","content": str1+context});
    let r;
    await queryPromise(q).then(async result=>{
        sequence_no=result.length;
        result=JSON.parse(JSON.stringify(result));
        for(let i=0;i<result.length;i++){
            //won't push in time 
            chat.push({"role":"user", "content": result[i].prompt});
            chat.push({"role":"assistant", "content": result[i].response});
        }
        chat.push({"role":"user", "content": p});
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
        console.log("JSON Submition\n==============");
        console.log(settings);
        try {
            const fetchResponse = await fetch(`https://api.openai.com/v1/chat/completions`, settings);
            const obj = await fetchResponse.json();
            console.log("OPEN AI response\n============");
            console.log(obj);
            chat.push({"role":"assistant", "content": obj.choices[0].message.content});
            
            console.log("\nTokens used: "+obj['usage']['total_tokens']);
            

            let q= "Insert into messages(session_id,sequence_no,prompt,response) values ('"+parse(session_id)+"',"+ sequence_no+",'"+parse(p)+"','"+parse(obj.choices[0].message.content)+"')";
            connection.query(q,(error,data)=>{
            if(error) console.log(error)
            else{
            console.log("Successfully inserted record");
            }
            })
            insertTokenCount(obj['usage']['total_tokens'],session_id);
            r= obj.choices[0].message.content;  
        } catch (e) {
            console.log(e);
            r= "An error has occured";
        }
    });
    return r;
}
    
// Cost
// text-babbage-001 0.0005  4x cheaper than gpt 3.5 turbo
// gpt-3.5-turbo    0.002 10x cheaper than davinci
// text-davinci-003 0.02
function insertTokenCount(count,session_id){
    let q=`Update sessions set tokens='${count}' where session_id='${session_id}'`;
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Inserted token count"+session_id);
        }
        })
}

async function deleteMessages(session_id){
    let q=`Delete from messages where session_id='${session_id}'`;
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Delted chat history of session "+session_id);
        }
    })
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