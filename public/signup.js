let submitButton=document.getElementById('submitButton');

let nameField=document.getElementById('name');
let usernameField=document.getElementById('username');
let passwordField=document.getElementById('password');
let keyField=document.getElementById('key');

submitButton.addEventListener('click',function(){
    submit(nameField.value, usernameField.value, passwordField.value, keyField.value);
});

async function submit(name,username,password,key){
    const data= {"name":name,"username":username,"password":password,"key":key};
    const settings = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    let response= await fetch("/signup",settings);
    let json=await response.json();
    if(json.status){
        window.location= "/index";
    }else{
        window.alert(json.message);
    }
}