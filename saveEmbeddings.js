const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const csv = require("csv-parser");

const configuration = new Configuration({
    organization: process.env.CHATBOT_ORG,
    apiKey: process.env.CHATBOT_ORG_KEY,
});
const openai = new OpenAIApi(configuration);


async function saveEmbedding(data){
    // Data contains the row information in data.csv as an array
    console.log(data[1]+","+data[2]+","+data[3]); 
    const e = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: data[1]+' - '+data[2]+' - '+data[3],
      });
    let embedding=JSON.parse((JSON.stringify(e.data))).data[0].embedding; // store an array of floats representing the embedding for the string
    
    let index=data[0];
    fs.appendFile("embeddings.csv", "\n"+index+","+embedding, "utf-8", (err) => {
        if (err) console.log(err);
        else console.log("Embeddings saved");
    });
}
start();
async function start(){
    const { finished } = require('stream');
    const { promisify } = require('util');
    const finishedAsync = promisify(finished);
    const readable=fs.createReadStream("data.csv")
    .pipe(csv())
    .on("data",async data => await saveEmbedding(Object.values(data)))
    .on("end", () => console.log("Embeddings processed"));
    await finishedAsync(readable);
}
