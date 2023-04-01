let submitButton=document.getElementById('submitButton');

let usernameField=document.getElementById('username');
let passwordField=document.getElementById('password');

submitButton.addEventListener('click',function(){
    console.log(usernameField);
    submit(usernameField.value, passwordField.value);
});


async function submit(username,password){
    const data= {"username":username,"password":password};
    const settings = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    let response= await fetch("/login",settings);
    let json=await response.json();
    if(json.status){
        window.location.href = "/index";
    }else{
        window.alert(json.message);
    }
}