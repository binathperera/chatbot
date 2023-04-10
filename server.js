const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const bodyParser = require('body-parser');
const fetch= require('node-fetch');
const fs = require("fs");
const cors= require('cors');
const csv = require("csv-parser");
const session = require("express-session");
const cookie_parser=require("cookie-parser");
const mysql = require("mysql");
const MySQLStore = require('express-mysql-session')(session);
const dotenv = require('dotenv');
const { response } = require('express');
dotenv.config();
const appserverport= process.env.CHATBOT_APPSERVER_PORT;
const dbuser= process.env.CHATBOT_DB_USER;
const dbpassword= process.env.CHATBOT_DB_PASSWORD;
const db= process.env.CHATBOT_DB;
const dbhost= process.env.CHATBOT_DB_HOST;
const dbport= process.env.CHATBOT_DB_PORT;

var options = {
	host: dbhost,
	port: dbport,
	user: dbuser,
	password: dbpassword,
	database: db,   
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
var sessionStore = new MySQLStore(options);
var connection = mysql.createConnection({
    host     : dbhost,
    user     : dbuser,
    password : dbpassword,
    database : db,
    timezone: 'utc'
  });
connection.connect();

const app=express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(cookie_parser());
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



let assistant;
let str1;
let context;

app.get('/index',(req,res)=>{
    console.log("after");
    console.log(req.session);
    if(req.session['username']){
        res.sendFile(__dirname+"/public/index.html");
    }
    else{
        res.redirect("/");
    }
});
app.get('/index.js',(req,res)=>{
    res.sendFile(__dirname+"/public/index.js");
});
app.get('/index.css',(req,res)=>{
    res.sendFile(__dirname+"/public/index.css");
});
app.get('/settings',(req,res)=>{
    if(req.session['username']){
        res.sendFile(__dirname+"/public/settings.html");
    }else{
        res.redirect("/");
    }
});
app.get('/settings/get',(req,res)=>{
    let q= "Select * from users where username='"+req.session['username']+"'";
    res.writeHead(200,{"Content-Type":"application/json"});
    let username,name,password,api_key,retrieved=false;
    connection.query(q,(error,data)=>{
        if(error){
            console.log(error)
        } 
        else{
            console.log(data[0])
            if(data){
                username=data[0].username;
                name=data[0].name;
                password=data[0].password;
                api_key=data[0].api_key;
                retrieved=true;
                res.write(
                    JSON.stringify(
                        {
                            username:username,
                            name:name,
                            password:password,
                            key:api_key,
                            retrieved:retrieved
                        })
                    );
            }
        }
        res.end();
        console.log(""+username+name+password+api_key)
    })
});
app.post('/user/update',(req,res)=>{
    res.writeHead(200,{"Content-Type":"application/json"}); 
    let q= `Update users set name='${req.body.name}' , password='${req.body.password}' , api_key='${req.body.key}' where username='${req.session['username']}'`;
    req.session['key']=req.body.key;
    connection.query(q,(error,data)=>{
        if(error){
            console.log(error)
            res.write(JSON.stringify({status:false}));
        } 
        else{
            res.write(JSON.stringify({status:true}));
        }
        res.end();
    })
});
app.get('/user/delete',(req,res)=>{
    res.writeHead(200,{"Content-Type":"application/json"}); 
    let q= "Delete from users where username='"+req.session['username']+"'";
    connection.query(q,(error,data)=>{
        if(error){
            console.log(error)
            res.write(JSON.stringify({status:false}));
        } 
        else{
            res.write(JSON.stringify({status:true}));
        }
        res.end();
    })
});
app.get('/settings.js',(req,res)=>{
    res.sendFile(__dirname+"/public/settings.js");
});
app.get('/settings.css',(req,res)=>{
    res.sendFile(__dirname+"/public/settings.css");
});
app.get('/',(req,res)=>{
    if(req.session['username']){
        res.redirect("/index");
    }
    else{
        res.sendFile(__dirname+"/public/login.html");
    }
});
app.get('/login.js',(req,res)=>{
    res.sendFile(__dirname+"/public/login.js");
});
app.get('/login.css',(req,res)=>{
    res.sendFile(__dirname+"/public/login.css");
});
app.get('/signup',(req,res)=>{
    res.sendFile(__dirname+"/public/signup.html");
});
app.get('/signup.js',(req,res)=>{
    res.sendFile(__dirname+"/public/signup.js");
});
app.get('/signup.css',(req,res)=>{
    res.sendFile(__dirname+"/public/signup.css");
});
app.get('/microphone-logo-png.png',(req,res)=>{
    res.sendFile(__dirname+"/public/microphone-logo-png.png");
});
app.get('/history',(req,res)=>{
    let q= "Select * from messages where session_id='"+req.sessionID+"' order by sequence_no";
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           data.push({"clear": isDelete(req.sessionID)});
           res.json(data);
        }
    })
});
app.get('/tokenusage/:from/:to',(req,res)=>{
    let fromDate=req.params.from;
    let toDate=req.params.to;
    let q= `Select * from datetoken where username='${req.session['username']}' and DATE(date)>='${fromDate}' and DATE(date)<='${toDate}'`;
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log(data);
           res.json(data);
        }
    })
});
app.get('/delete',async (req,res)=>{
    deleteMessages(req.sessionID);
});

app.post('/login',async (req,res)=>{
    //Log user
    response.writeHead(200,{"Content-Type":"application/json"});
    console.log(req.body);
    var username=req.body.username;
    let password=req.body.password;
    let q= "Select count(*) as count from users where username='"+username+"' and password='"+password+"'";
    console.log(q);
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
            if(data[0]!=undefined){
                if(data[0].count==1){
                    res.write(JSON.stringify({status:true,message:""}))
                }else{
                    res.write(JSON.stringify({status:false,message:"Incorrect username or password"}));
                }              
                if(data[0].count==1){
                    q=`Select api_key from users where username='${username}'`;
                    connection.query(q,async (error,data)=>{
                        if(error){
                            console.log(error);
                            req.session['key']=null;
                            req.session['username']=username;
                            req.session.save();
                        }else{
                            console.log(data)
                            req.session['key']= data[0].api_key;
                            req.session['username']= username;
                            req.session.save();
                        }
                    });
                    let q2= "Update sessions set username='"+username+"' where session_id='"+req.sessionID+"'";
                    connection.query(q2,(error,data)=>{
                        if(error) console.log(error)
                        else{
                        console.log("Signed in- user session alocated")
                        }
                    })
                }
            }else{
                res.write(JSON.stringify({status:false,message:"Couldn't retrieve account details"}));
            }
        }
    })
    console.log("Info set ");
    console.log(req.session);
    res.end();
    
});
app.post('/signup',async (req,res)=>{
    //Sign up user
    response.writeHead(200,{"Content-Type":"application/json"});
    let name=req.body.name;
    let key=req.body.key;
    let username=req.body.username;
    let password=req.body.password;
    let q= `insert into users values ('${username}','${password}','${name}','${key}')`;
    console.log(q);
    connection.query(q,(error,data)=>{
        if(error){
            console.log(error);
            if(error.code=='ER_DUP_ENTRY'){
                res.write(JSON.stringify({status:false,message:"Account for this email already exists"})); 
            }else{
                res.write(JSON.stringify({status:false,message:"Couldn't sign you up"})); 
            }
        } 
        else{
            console.log(data);
            if(data.affectedRows==1){
                res.write(JSON.stringify({status:(data.affectedRows==1),message:"Sign up completed"}));
                req.session['key']= key;
                req.session['username']= username;
                req.session.save();
            }else{
                res.write(JSON.stringify({status:false,message:"Couldn't sign you up"})); 
            }
        }
        res.end();
    })
    let q2= "Update sessions set username='"+username+"' where session_id='"+req.sessionID+"'";
    connection.query(q2,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Signed in- user session alocated")
        }
    })
});

app.get('/signout',async(req,res)=>{
    // destroy session data
    let q1= "Delete from messages where session_id='"+req.sessionID+"'";
    connection.query(q1,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Signed out- user messages deleted")
        }
    })
    let q2= "Delete from sessions where session_id='"+req.sessionID+"'";
    connection.query(q2,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Signed out- user session dealocated")
        }
    })
    req.session.destroy();
    // redirect to homepage
    res.redirect('/');
})
app.post('/',async (req,res)=>{
    res.writeHead(200,{"Content-Type":"application/json"});
    assistant=req.body.assistant;
    str1=`You are a friendly AI assistant named `+assistant+` built to help the customers of BLUE LOTUS 360. Answer as truthfully as possible using the provided text, and if the answer is not contained within the text below, say I don't know.`    
    //  q=`Select api_key from users where username='${req.app.locals.username}'`;
    // connection.query(q,async (error,data)=>{
    //     if(error){
    //         console.log(error);
    //         res.write(JSON.stringify({
    //             //message: req.body.prompt
    //             message: "Sorry, coudn't obtain your api key",
    //             clear: await isDelete(req.sessionID)
    //         }));
    //         res.end();
    //     }else{
    //         console.log(data)
    //         let key=data[0].api_key;
    //         res.write(JSON.stringify({
    //             //message: req.body.prompt
    //             message: await ask(req.body.prompt,req.sessionID,key),
    //             clear: await isDelete(req.sessionID)
    //         }));
    //         res.end();
    //     }
    // });

    if(req.session['key']==null){
        res.write(JSON.stringify({
                        message: "Sorry, coudn't obtain your api key",
                        clear: await isDelete(req.sessionID)
                }));
        res.end();
    }else{
        res.write(JSON.stringify({
            message: await ask(req.body.prompt,req.sessionID,req.session['key'],req.session['username']),
            clear: await isDelete(req.sessionID)
        }));
        res.end();
    }

});


app.listen(appserverport, ()=>{
    console.log(`http://localhost:${appserverport}`);
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

async function ask(p,session_id,key,username){
    let stat=await validate(key);
    if(stat!=null){
        return stat;
    }
    if(isDelete(session_id)){
        return "Please clear the chat history";
    }
    context=`\nContext: `;
    let arr= await getEmbeddings(p,key);
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
                'Authorization': 'Bearer '+key,
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
            if(obj.error && obj.error.code=='invalid_api_key'){
                r= "Your api key is invalid";
                return;
            }else{
                chat.push({"role":"assistant", "content": obj.choices[0].message.content});
            }
            
            
            console.log("\nTokens used: "+obj['usage']['total_tokens']);
            

            let q= "Insert into messages(session_id,sequence_no,prompt,response) values ('"+parse(session_id)+"',"+ sequence_no+",'"+parse(p)+"','"+parse(obj.choices[0].message.content)+"')";
            connection.query(q,(error,data)=>{
            if(error) console.log(error)
            else{
            console.log("Successfully inserted record");
            }
            })
            insertTokenCount(obj['usage']['total_tokens'],session_id,username);
            r= obj.choices[0].message.content;  
        } catch (e) {
            console.log(e);
            r= "An error has occured";
        }
    });
    return r;
}
    
// Cost per 1000 tokens
// text-babbage-001 0.0005  4x cheaper than gpt 3.5 turbo
// gpt-3.5-turbo    0.002 10x cheaper than davinci
// text-davinci-003 0.02
async function insertTokenCount(count,session_id,username){
    let q=`Update sessions set tokens='${count}' where session_id='${session_id}'`;
    connection.query(q,(error,data)=>{
        if(error) console.log(error)
        else{
           console.log("Inserted token count"+session_id);
        }
        })

    let d= new Date();
    var dd= String(d.getDate()).padStart(2, '0');
    var mm= String(d.getMonth()+1).padStart(2, '0');
    var yyyy=d.getFullYear();
    d= yyyy+'-'+mm+'-'+dd
    let q1= `Select * from datetoken where username='${username}' and date='${d}'`;
    connection.query(q1,(error,data)=>{
        if(error) console.log(error)
        else{
            if(data[0]){
                let q2= `Update datetoken set tokens=tokens+'${count}' where username='${username}' and date='${d}'`;
                connection.query(q2,(error,data)=>{
                    if(error) console.log(error)
                    else{
                        console.log(data)
                    }
                })
            }else{
                let q2= `Insert into datetoken values ('${username}','${d}',${count})`;
                connection.query(q2,(error,data)=>{
                    if(error) console.log(error)
                    else{
                        console.log(data)
                    }
                })
            }
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


async function getEmbeddings(p,key){
    // let data= { 
    //     model: "text-embedding-ada-002",
    //     input: p
    // }
    // const settings = {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': 'Bearer '+ key,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(data)
    // };

    const configuration = new Configuration({
        apiKey: key,
    });
    const openai = new OpenAIApi(configuration);
    const e = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: p,
      });
    //const e = await fetch('https://api.openai.com/v1/embeddings',settings);
    //console.log(e);
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

/* Will return 1 for incorrect key. 2 if token limit has been exceeded. 0 if the key can be used. */
async function validate(key){
    let chat=new Array();
    chat.push({"role":"system","content": "You are a chatbot"});
    chat.push({"role":"user", "content": "Hi"});
    let data= { 
        model: "gpt-3.5-turbo",
        messages: chat
    }
    const settings = {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    const fetchResponse = await fetch(`https://api.openai.com/v1/chat/completions`, settings);
    const obj = await fetchResponse.json();
    try{
        return obj.error.message;
    }catch(e){
        return null;
    }
}
// 1st training - "babbage:ft-personal-2023-02-28-08-37-45"